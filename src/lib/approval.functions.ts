import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { t as tr } from "@/i18n";

// مسار الحجز: طلب → موافقة المصوّرة (24 ساعة) → عربون (48 ساعة مهلة متّفق عليها، بلا إلغاء تلقائي؛ اليوم يبقى محجوزاً) → تثبيت.
// الموافقة والرفض من جهة المصوّرة فقط، وكل خطوة تُبلَّغ بها العروس فوراً.

const isId = (s: unknown) => typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s);

async function loadOwnPending(userId: string, bookingId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: bk, error } = await supabaseAdmin.from("bookings")
    .select("id, photographer_id, status, needs_approval, approved_at, phone_verified_at, client_name, event_date, deposit_amount, deleted_at")
    .eq("id", bookingId).maybeSingle();
  if (error) throw new Error(error.message);
  const b: any = bk;
  if (!b || b.deleted_at) throw new Error(tr("الحجز غير موجود"));
  if (b.photographer_id !== userId) throw new Error("forbidden");
  if (!b.needs_approval || b.approved_at) throw new Error(tr("هذا الطلب ليس بانتظار موافقتك"));
  if (b.status !== "pending_deposit" && b.status !== "quote") throw new Error(tr("هذا الطلب لم يعد مفتوحاً"));
  if (!b.phone_verified_at) throw new Error(tr("العروس لم تؤكد طلبها بعد"));
  return { b, supabaseAdmin };
}

async function photographerName(admin: any, id: string) {
  const { data } = await admin.from("profiles").select("display_name, username").eq("id", id).maybeSingle();
  return data?.display_name || data?.username || tr("المصوّرة");
}

export const approveBookingRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { booking_id: string }) => {
    if (!d || !isId(d.booking_id)) throw new Error("invalid booking_id");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    const { b, supabaseAdmin } = await loadOwnPending(userId, data.booking_id);
    const { data: hrs } = await (supabaseAdmin as any).rpc("approval_window_hours", { _pid: b.photographer_id });
    const windowHours = [24, 48, 72].includes(Number(hrs)) ? Number(hrs) : 24;
    if (new Date(b.phone_verified_at).getTime() + windowHours * 3600_000 < Date.now()) {
      throw new Error(tr("انتهت مهلة الرد ({0} ساعة) وأُلغي الطلب تلقائياً", [windowHours]));
    }
    const now = new Date().toISOString();
    const { data: upd, error } = await supabaseAdmin.from("bookings")
      .update({ approved_at: now, updated_at: now } as any)
      .eq("id", b.id).is("approved_at" as any, null).select("id").maybeSingle();
    if (error) throw new Error(error.message);
    if (!upd) return { ok: true };

    await supabaseAdmin.from("audit_logs").insert({
      action: "booking.approve", actor_id: userId, entity_type: "booking", entity_id: b.id,
      after_data: { approved_at: now } as any,
    });

    const name = await photographerName(supabaseAdmin, b.photographer_id);
    const deposit = Number(b.deposit_amount ?? 0);
    const { notifyBride } = await import("@/lib/notify.server");
    await notifyBride(b.id, {
      subject: `${name} وافقت على طلب حجزك ✨`,
      title: "تمت الموافقة على طلبك",
      lines: deposit > 0
        ? [
            `${name} وافقت على حجزك بتاريخ ${b.event_date}.`,
            `الخطوة التالية: حوّلي العربون (${deposit} د.أ) خلال 48 ساعة، ثم ارفعي صورة الإيصال من صفحة المتابعة حتى تثبّت حجزك بسرعة.`,
            "تفاصيل الدفع موجودة الآن في صفحة متابعة الحجز.",
          ]
        : [`${name} وافقت على حجزك بتاريخ ${b.event_date}.`, "تابعي حجزك من صفحة المتابعة."],
      template: "booking_approved_client",
      ctaLabel: deposit > 0 ? "تفاصيل دفع العربون" : "متابعة الحجز",
    });
    return { ok: true };
  });

export const rejectBookingRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { booking_id: string; reason: string }) => {
    if (!d || !isId(d.booking_id)) throw new Error("invalid booking_id");
    const reason = String(d.reason ?? "").trim();
    if (reason.length < 3) throw new Error(tr("اكتبي سبب الرفض — رح يوصل للعروس"));
    if (reason.length > 500) throw new Error(tr("السبب طويل جداً"));
    return { booking_id: d.booking_id, reason };
  })
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    const { b, supabaseAdmin } = await loadOwnPending(userId, data.booking_id);
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from("bookings").update({
      status: "cancelled", cancelled_at: now, cancelled_by: userId,
      cancellation_reason: data.reason, refund_amount: 0, refund_status: "none", updated_at: now,
    } as any).eq("id", b.id);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_logs").insert({
      action: "booking.reject", actor_id: userId, entity_type: "booking", entity_id: b.id,
      after_data: { status: "cancelled", reason: data.reason } as any,
    });

    const name = await photographerName(supabaseAdmin, b.photographer_id);
    const { appBase } = await import("@/lib/verification.server");
    const { notifyBride } = await import("@/lib/notify.server");
    await notifyBride(b.id, {
      subject: `بخصوص طلب حجزك مع ${name}`,
      title: "المصوّرة اعتذرت عن الطلب",
      lines: [
        `${name} اعتذرت عن حجزك بتاريخ ${b.event_date}.`,
        `السبب: ${data.reason}`,
        "لم يُدفع أي مبلغ. يمكنك البحث عن مصوّرة أخرى متاحة بنفس التاريخ.",
      ],
      template: "booking_rejected_client",
      ctaLabel: "مصوّرات متاحات بنفس التاريخ",
      ctaUrl: `${appBase()}/search?date=${b.event_date}`,
    });
    return { ok: true };
  });

// رفض إيصال عربون غير صحيح: يُمسح الإيصال فتعود العروس لحالة «ارفعي الإيصال» مع السبب. الحجز يبقى كما هو ولا يُلغى.
export const rejectDepositProof = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { booking_id: string; reason: string }) => {
    if (!d || !isId(d.booking_id)) throw new Error("invalid booking_id");
    const reason = String(d.reason ?? "").trim();
    if (reason.length < 3) throw new Error(tr("اكتبي سبب الرفض — رح يوصل للعروس"));
    if (reason.length > 500) throw new Error(tr("السبب طويل جداً"));
    return { booking_id: d.booking_id, reason };
  })
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: bk, error } = await supabaseAdmin.from("bookings")
      .select("id, photographer_id, status, client_name, event_date, deposit_amount, deposit_sent_at, deposit_proof_url, deposit_confirmed_at, deleted_at")
      .eq("id", data.booking_id).maybeSingle();
    if (error) throw new Error(error.message);
    const b: any = bk;
    if (!b || b.deleted_at) throw new Error(tr("الحجز غير موجود"));
    if (b.photographer_id !== userId) throw new Error("forbidden");
    if (b.status !== "pending_deposit" || b.deposit_confirmed_at) throw new Error(tr("هذا الحجز ليس بانتظار مراجعة العربون"));
    if (!b.deposit_sent_at && !b.deposit_proof_url) throw new Error(tr("لا يوجد إيصال لرفضه"));

    const now = new Date().toISOString();
    const { data: done, error: uerr } = await supabaseAdmin.from("bookings")
      .update({ deposit_sent_at: null, deposit_proof_url: null, updated_at: now } as any)
      .eq("id", b.id).eq("status", "pending_deposit").is("deposit_confirmed_at", null)
      .select("id").maybeSingle();
    if (uerr) throw new Error(uerr.message);
    if (!done) throw new Error(tr("تغيّرت حالة الحجز. حدّثي الصفحة."));

    await (supabaseAdmin as any).from("booking_events").insert({
      booking_id: b.id, kind: "deposit_rejected", actor_id: userId, actor_role: "photographer",
      reason: data.reason, meta: { had_proof_file: !!b.deposit_proof_url },
    });
    await supabaseAdmin.from("audit_logs").insert({
      action: "booking.deposit_proof_rejected", actor_id: userId, entity_type: "booking", entity_id: b.id,
      after_data: { reason: data.reason } as any,
    });

    const name = await photographerName(supabaseAdmin, b.photographer_id);
    const { notifyBride } = await import("@/lib/notify.server");
    await notifyBride(b.id, {
      subject: `${name}: إيصال العربون يحتاج مراجعة`,
      title: "لم يتم قبول إيصال العربون",
      lines: [
        `${name} لم تتمكن من تأكيد العربون من الإيصال المرفوع لحجز ${b.event_date}.`,
        `السبب: ${data.reason}`,
        `حجزك ما زال محفوظاً. ارفعي إيصالاً صحيحاً (${b.deposit_amount} د.أ) من صفحة المتابعة.`,
      ],
      template: "deposit_proof_rejected_client",
      ctaLabel: "رفع الإيصال",
    });
    return { ok: true };
  });
