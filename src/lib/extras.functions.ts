import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { t as tr } from "@/i18n";

// ============================================================================
// extras.functions.ts — تأكيد الجاهزية قبل المناسبة، استمارة يوم العرس، ملاحق الاتفاق
// الكتابة كلها هنا (service role) بعد التحقق من الملكية أو رابط العروس.
// ============================================================================

const UUID_RE = /^[0-9a-f-]{36}$/i;
const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;
const BASE = () => process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";

// اليوم بتوقيت الأردن، وعدد الأيام حتى المناسبة
function daysTo(eventDate: string) {
  const today = new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10);
  return Math.round((Date.parse(eventDate) - Date.parse(today)) / 86400000);
}

async function ownBooking(context: any, bookingId: string) {
  const { supabase, userId } = context;
  const { data: bk, error } = await supabase.from("bookings")
    .select("id, photographer_id, status, event_date, client_email, client_name, client_tracking_token, deleted_at, base_price")
    .eq("id", bookingId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!bk || bk.deleted_at) throw new Error(tr("الحجز غير موجود"));
  if (bk.photographer_id !== userId) throw new Error(tr("غير مصرح"));
  return bk;
}

async function bookingByToken(token: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: bk } = await (supabaseAdmin as any).from("bookings")
    .select("id, photographer_id, status, event_date, total_price, client_name, deleted_at, verified_via, client_email")
    .eq("client_tracking_token", token).maybeSingle();
  if (!bk || bk.deleted_at) throw new Error(tr("الحجز غير موجود"));
  if (bk.status !== "confirmed" && bk.status !== "completed") throw new Error(tr("هذا متاح بعد تأكيد الحجز"));
  return { bk, supabaseAdmin: supabaseAdmin as any };
}

// ----- المصوّرة: "جاهزة للموعد" (خلال آخر 7 أيام قبل المناسبة) -----
export const confirmReady = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { booking_id: string }) => {
    if (!d || !UUID_RE.test(d.booking_id ?? "")) throw new Error("invalid booking_id");
    return d;
  })
  .handler(async ({ data, context }) => {
    const bk = await ownBooking(context, data.booking_id);
    if (bk.status !== "confirmed") throw new Error(tr("الحجز غير مؤكّد"));
    const d = daysTo(String(bk.event_date));
    if (d < 0 || d > 7) throw new Error(tr("التأكيد متاح خلال الأسبوع الأخير قبل المناسبة"));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("bookings")
      .update({ ready_confirmed_at: new Date().toISOString() }).eq("id", bk.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ----- العروس: استمارة يوم العرس -----
type EventDayInfo = {
  no_flash?: boolean; no_drone?: boolean; women_only?: boolean;
  live_story?: "yes" | "no";
  skip_guests?: string; plan_b?: string; extra?: string;
};

export const saveEventDayInfo = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; info: EventDayInfo }) => {
    if (!d || !TOKEN_RE.test(d.token ?? "")) throw new Error("invalid token");
    const i = d.info ?? {};
    const txt = (v: any) => (typeof v === "string" ? v.trim().slice(0, 500) : "");
    const info: EventDayInfo = {
      no_flash: !!i.no_flash, no_drone: !!i.no_drone, women_only: !!i.women_only,
      live_story: i.live_story === "yes" ? "yes" : "no",
      skip_guests: txt(i.skip_guests), plan_b: txt(i.plan_b), extra: txt(i.extra),
    };
    return { token: d.token, info };
  })
  .handler(async ({ data }) => {
    const { bk, supabaseAdmin } = await bookingByToken(data.token);
    if (daysTo(String(bk.event_date)) < 0) throw new Error(tr("مضى موعد المناسبة"));
    const { error } = await supabaseAdmin.from("bookings")
      .update({ event_day_info: { ...data.info, saved_at: new Date().toISOString() } }).eq("id", bk.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ----- المصوّرة: ملحق اتفاق (خدمة/مبلغ/تغيير بعد الحجز) -----
export const addAddendum = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    booking_id: string; description: string; amount: number;
    kind?: "general" | "substitute" | "reschedule" | "discount";
    substitute_name?: string; substitute_link?: string;
    new_event_date?: string; new_start_time?: string; new_end_time?: string;
  }) => {
    if (!d || !UUID_RE.test(d.booking_id ?? "")) throw new Error("invalid booking_id");
    const kind = (["general", "substitute", "reschedule", "discount"] as const).includes(d.kind as any) ? d.kind! : "general";
    const description = String(d.description ?? "").trim();
    if (description.length < 2) throw new Error(tr("اكتبي ما الذي اتفقتما عليه"));
    if (description.length > 1000) throw new Error(tr("الوصف طويل جداً"));
    let amount = Number(d.amount || 0);
    if (!Number.isFinite(amount) || amount < 0 || amount > 100000) throw new Error(tr("المبلغ غير صحيح"));
    // التخفيض: المصوّرة تكتب قيمته موجبة ونخزّنها سالبة؛ البديلة ونقل الموعد بلا مبلغ
    if (kind === "discount") { if (amount <= 0) throw new Error(tr("اكتبي قيمة التخفيض")); amount = -amount; }
    if (kind === "substitute" || kind === "reschedule") amount = 0;
    const extra: Record<string, string | null> = {};
    if (kind === "substitute") {
      const name = String(d.substitute_name ?? "").trim().slice(0, 120);
      if (name.length < 2) throw new Error(tr("اكتبي اسم المصوّرة البديلة"));
      extra.substitute_name = name;
      extra.substitute_link = String(d.substitute_link ?? "").trim().slice(0, 500) || null;
    }
    if (kind === "reschedule") {
      const isDate = /^\d{4}-\d{2}-\d{2}$/.test(d.new_event_date ?? "");
      const isTime = (v?: string) => !v || /^\d{2}:\d{2}$/.test(v);
      if (!isDate) throw new Error(tr("اختاري التاريخ الجديد"));
      if (!isTime(d.new_start_time) || !isTime(d.new_end_time)) throw new Error(tr("اختاري وقت البداية والنهاية"));
      const today = new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10);
      if (d.new_event_date! < today) throw new Error(tr("لا يمكن اختيار تاريخ في الماضي"));
      extra.new_event_date = d.new_event_date!;
      extra.new_start_time = d.new_start_time || null;
      extra.new_end_time = d.new_end_time || null;
    }
    return { booking_id: d.booking_id, description, amount: Math.round(amount * 100) / 100, kind, extra };
  })
  .handler(async ({ data, context }) => {
    const bk = await ownBooking(context, data.booking_id);
    if (bk.status !== "confirmed" && bk.status !== "completed") throw new Error(tr("الملحق متاح بعد تأكيد الحجز"));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.kind === "reschedule") {
      const { data: full } = await supabaseAdmin.from("bookings").select("start_time, end_time").eq("id", bk.id).maybeSingle();
      const { data: clash, error: clashErr } = await supabaseAdmin.rpc("has_booking_conflict", {
        _pid: bk.photographer_id, _date: data.extra.new_event_date!,
        _start: (data.extra.new_start_time ?? full?.start_time) as string, _end: (data.extra.new_end_time ?? full?.end_time) as string, _exclude: bk.id,
      });
      if (clashErr) console.error("[addAddendum] conflict check failed:", clashErr);
      else if (clash) throw new Error(tr("عندكِ حجز آخر في هذا التاريخ. اختاري تاريخاً آخر."));
    }
    // سقف حماية للعروس: مجموع الملاحق (المعلّقة + الموافَق عليها) لا يتجاوز نصف سعر الباقة (حد أدنى 100 د.أ)،
    // وملحقات معلّقة قليلة؛ أي زيادة أكبر تحتاج حجزاً جديداً أو دعماً.
    const { data: existing } = await (supabaseAdmin as any).from("booking_addenda")
      .select("amount, status").eq("booking_id", bk.id).in("status", ["pending", "accepted"]);
    const open = (existing ?? []) as { amount: number; status: string }[];
    if (open.filter((x) => x.status === "pending").length >= 3) {
      throw new Error(tr("عندكِ 3 ملاحق بانتظار موافقة العروس. انتظري ردّها قبل إضافة غيرها."));
    }
    const cap = Math.max(100, Number(bk.base_price ?? 0) * 0.5);
    // السقف للزيادات فقط؛ التخفيض لا يُحسب عليه
    const sum = open.reduce((s, x) => s + Math.max(0, Number(x.amount || 0)), 0) + Math.max(0, data.amount);
    if (data.amount > 0 && sum > cap) {
      throw new Error(tr("مجموع الملاحق على هذا الحجز لا يتجاوز {0} د.أ (نصف سعر الباقة). للمبالغ الأكبر تواصلي مع فريق ميموريا.", [Math.round(cap)]));
    }
    const { error } = await (supabaseAdmin as any).from("booking_addenda")
      .insert({ booking_id: bk.id, description: data.description, amount: data.amount, kind: data.kind, ...data.extra });
    if (error) throw new Error(error.message);
    if (bk.client_email && bk.client_tracking_token) {
      try {
        const { sendEmail, tplMessage } = await import("@/lib/email.server");
        const m = tplMessage({
          subject: "ملحق جديد على حجزكِ — بانتظار موافقتكِ",
          title: "ملحق اتفاق جديد",
          lines: [
            `مرحباً ${bk.client_name || ""}،`.trim(),
            `أُضيف ملحق على حجزكِ: ${data.description}`,
            data.kind === "substitute" ? `مصوّرة بديلة مقترحة: ${data.extra.substitute_name}. إذا رفضتِ يحق لكِ استرداد العربون كاملاً.`
              : data.kind === "reschedule" ? `موعد جديد مقترح: ${data.extra.new_event_date} (بدل الإلغاء، والعربون ينتقل معه).`
              : data.amount > 0 ? `المبلغ الإضافي: ${data.amount} د.أ (يُضاف إلى المتبقي).`
              : data.amount < 0 ? `تخفيض: ${-data.amount} د.أ من المتبقي.` : "بدون مبلغ إضافي.",
            "لا يُعتمد الملحق إلا بعد موافقتكِ من صفحة الحجز.",
          ],
          cta: { label: "راجعي الملحق", url: `${BASE()}/track/${bk.client_tracking_token}` },
        });
        await sendEmail({ to: bk.client_email, subject: m.subject, html: m.html, template: "addendum_new", related_booking_id: bk.id });
      } catch (e) {
        console.error("[addAddendum] email failed:", e);
      }
    }
    return { ok: true };
  });

export const withdrawAddendum = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => {
    if (!d || !UUID_RE.test(d.id ?? "")) throw new Error("invalid id");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: a } = await (supabaseAdmin as any).from("booking_addenda")
      .select("id, booking_id, status").eq("id", data.id).maybeSingle();
    if (!a) throw new Error(tr("الملحق غير موجود"));
    await ownBooking(context, a.booking_id);
    if (a.status !== "pending") throw new Error(tr("لا يمكن سحب ملحق ردّت عليه العميلة"));
    const { error } = await (supabaseAdmin as any).from("booking_addenda")
      .update({ status: "withdrawn", responded_at: new Date().toISOString() }).eq("id", a.id).eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ----- العروس: موافقة/رفض الملحق. الموافقة تضيف المبلغ إلى المجموع (فيزيد المتبقي) -----
export const respondAddendum = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; id: string; accept: boolean; code?: string | null }) => {
    if (!d || !TOKEN_RE.test(d.token ?? "")) throw new Error("invalid token");
    if (!UUID_RE.test(d.id ?? "")) throw new Error("invalid id");
    return { token: d.token, id: d.id, accept: !!d.accept, code: d.code ?? null };
  })
  .handler(async ({ data }) => {
    const { bk, supabaseAdmin } = await bookingByToken(data.token);
    // الموافقة على مبلغ إضافي تحتاج رمزاً من بريد العروس (المصوّرة تعرف الرابط ولا تعرف الرمز)
    if (data.accept) {
      const { data: pending } = await supabaseAdmin.from("booking_addenda")
        .select("amount, kind, new_event_date, new_start_time, new_end_time").eq("id", data.id).eq("booking_id", bk.id).eq("status", "pending").maybeSingle();
      // نقل الموعد: نتأكد أن التاريخ الجديد ما زال فاضياً عند المصوّرة قبل أي شيء
      if (pending?.kind === "reschedule") {
        const { data: full } = await supabaseAdmin.from("bookings").select("start_time, end_time").eq("id", bk.id).maybeSingle();
        const { data: clash } = await supabaseAdmin.rpc("has_booking_conflict", {
          _pid: bk.photographer_id, _date: pending.new_event_date,
          _start: pending.new_start_time ?? full?.start_time, _end: pending.new_end_time ?? full?.end_time, _exclude: bk.id,
        });
        if (clash) throw new Error(tr("التاريخ الجديد لم يعد متاحاً عند المصوّرة. راسليها لاقتراح موعد آخر."));
      }
      const { stepUpApplies, consumeStepUpCode } = await import("@/lib/stepup.server");
      const needsCode = pending && (Number(pending.amount) > 0 || pending.kind === "reschedule");
      if (needsCode && stepUpApplies(bk)) await consumeStepUpCode(bk.id, "addendum", data.code);
    }
    const { data: upd, error } = await supabaseAdmin.from("booking_addenda")
      .update({ status: data.accept ? "accepted" : "declined", responded_at: new Date().toISOString() })
      .eq("id", data.id).eq("booking_id", bk.id).eq("status", "pending")
      .select("amount, kind, new_event_date, new_start_time, new_end_time").maybeSingle();
    if (error) throw new Error(error.message);
    if (!upd) throw new Error(tr("هذا الملحق لم يعد بانتظار ردّكِ"));
    if (data.accept && Number(upd.amount) !== 0) {
      // التخفيض لا ينزّل المجموع تحت العربون المدفوع
      const { data: cur } = await supabaseAdmin.from("bookings").select("total_price, deposit_amount").eq("id", bk.id).maybeSingle();
      const next = Math.max(Number(cur?.deposit_amount || 0), Number(cur?.total_price || 0) + Number(upd.amount));
      const { error: e2 } = await supabaseAdmin.from("bookings").update({ total_price: next }).eq("id", bk.id);
      if (e2) throw new Error(e2.message);
    }
    if (data.accept && upd.kind === "reschedule" && upd.new_event_date) {
      const patch: Record<string, unknown> = { event_date: upd.new_event_date, ready_confirmed_at: null, reminders_sent: [] };
      if (upd.new_start_time) patch.start_time = upd.new_start_time;
      if (upd.new_end_time) patch.end_time = upd.new_end_time;
      const { error: e3 } = await supabaseAdmin.from("bookings").update(patch).eq("id", bk.id);
      if (e3) throw new Error(e3.message);
    }
    return { ok: true };
  });

// بيانات الإضافات لصفحة العروس (تُدمج في getBookingByToken)
export async function extrasForToken(supabaseAdmin: any, bookingId: string) {
  const { data: gal } = await supabaseAdmin.from("delivery_galleries").select("id").eq("booking_id", bookingId).maybeSingle();
  const { count: photosDelivered } = gal
    ? await supabaseAdmin.from("delivery_photos").select("id", { count: "exact", head: true }).eq("gallery_id", gal.id)
    : { count: 0 };
  const { count: reviewCount } = await supabaseAdmin.from("reviews").select("id", { count: "exact", head: true }).eq("booking_id", bookingId);
  const [{ data: b }, { data: ad }] = await Promise.all([
    supabaseAdmin.from("bookings").select("ready_confirmed_at, event_day_info, privacy_level").eq("id", bookingId).maybeSingle(),
    supabaseAdmin.from("booking_addenda").select("id, description, amount, status, created_at, responded_at, kind, substitute_name, substitute_link, new_event_date, new_start_time, new_end_time")
      .eq("booking_id", bookingId).neq("status", "withdrawn").order("created_at"),
  ]);
  return {
    ready_confirmed_at: b?.ready_confirmed_at ?? null,
    event_day_info: b?.event_day_info ?? null,
    privacy_level: b?.privacy_level ?? "public",
    addenda: ad ?? [],
    photos_delivered: photosDelivered ?? 0,
    has_review: (reviewCount ?? 0) > 0,
  };
}

// ----- العروس: تعديل العنوان (حتى يوم المناسبة) والوقت (قبل موافقة المصوّرة فقط) -----
// كل تعديل يُكتب كرسالة في محادثة الحجز حتى تراه المصوّرة.
export const clientEditDetails = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; venue_address?: string; start_time?: string; end_time?: string }) => {
    if (!d || !TOKEN_RE.test(d.token ?? "")) throw new Error("invalid token");
    const isTime = (s: any) => typeof s === "string" && /^\d{2}:\d{2}$/.test(s);
    const out: { token: string; venue_address?: string; start_time?: string; end_time?: string } = { token: d.token };
    if (typeof d.venue_address === "string") {
      const v = d.venue_address.trim();
      if (v.length > 500) throw new Error(tr("عنوان المكان طويل جداً"));
      out.venue_address = v;
    }
    if (d.start_time || d.end_time) {
      if (!isTime(d.start_time) || !isTime(d.end_time)) throw new Error(tr("اختاري وقت البداية والنهاية"));
      if (d.end_time! <= d.start_time!) throw new Error(tr("وقت الانتهاء يجب أن يكون بعد وقت البداية"));
      out.start_time = d.start_time; out.end_time = d.end_time;
    }
    return out;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data: bk } = await admin.from("bookings")
      .select("id, status, event_date, needs_approval, approved_at, venue_address, start_time, end_time, client_name, deleted_at")
      .eq("client_tracking_token", data.token).maybeSingle();
    if (!bk || bk.deleted_at) throw new Error(tr("الحجز غير موجود"));
    if (!["pending_deposit", "quote", "confirmed"].includes(bk.status)) throw new Error(tr("لا يمكن تعديل هذا الحجز"));
    if (daysTo(String(bk.event_date)) < 0) throw new Error(tr("مضى موعد المناسبة"));
    const patch: any = {};
    const lines: string[] = [];
    if (data.venue_address !== undefined && data.venue_address !== (bk.venue_address ?? "")) {
      patch.venue_address = data.venue_address || null;
      lines.push(tr("📍 غيّرتُ عنوان المكان إلى: {0}", [data.venue_address || "—"]));
    }
    if (data.start_time && (data.start_time !== String(bk.start_time).slice(0, 5) || data.end_time !== String(bk.end_time).slice(0, 5))) {
      const awaiting = bk.needs_approval && !bk.approved_at;
      if (!awaiting) throw new Error(tr("بعد موافقة المصوّرة يتغيّر الوقت بالاتفاق معها في الرسائل"));
      patch.start_time = data.start_time; patch.end_time = data.end_time;
      lines.push(tr("🕒 غيّرتُ الوقت إلى: {0} - {1}", [data.start_time, data.end_time]));
    }
    if (!lines.length) return { ok: true, unchanged: true };
    const { error } = await admin.from("bookings").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", bk.id);
    if (error) throw new Error(error.message);
    await admin.from("messages").insert({ booking_id: bk.id, sender_id: null, sender_name: bk.client_name || tr("العميل"), body: lines.join("\n") });
    return { ok: true };
  });

// ----- المصوّرة: التقييم على حجزها + رد علني واحد (لا يُعدَّل بعد النشر) -----
export const getBookingReview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { booking_id: string }) => {
    if (!d || !UUID_RE.test(d.booking_id ?? "")) throw new Error("invalid booking_id");
    return d;
  })
  .handler(async ({ data, context }) => {
    await ownBooking(context, data.booking_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: r } = await (supabaseAdmin as any).from("reviews")
      .select("id, rating, comment, client_name, is_published, created_at, photographer_reply, replied_at")
      .eq("booking_id", data.booking_id).maybeSingle();
    return r ?? null;
  });

export const replyToReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { booking_id: string; reply: string }) => {
    if (!d || !UUID_RE.test(d.booking_id ?? "")) throw new Error("invalid booking_id");
    const reply = String(d.reply ?? "").trim();
    if (reply.length < 2) throw new Error(tr("اكتبي ردّكِ"));
    if (reply.length > 1000) throw new Error(tr("الرد طويل جداً"));
    return { booking_id: d.booking_id, reply };
  })
  .handler(async ({ data, context }) => {
    await ownBooking(context, data.booking_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: upd, error } = await (supabaseAdmin as any).from("reviews")
      .update({ photographer_reply: data.reply, replied_at: new Date().toISOString() })
      .eq("booking_id", data.booking_id).is("photographer_reply", null).select("id").maybeSingle();
    if (error) throw new Error(error.message);
    if (!upd) throw new Error(tr("رددتِ على هذا التقييم سابقاً"));
    return { ok: true };
  });

// ----- المصوّرة: سجل رقم العروس على المنصّة (أعداد فقط، بدون أسماء مصوّرات أخريات) -----
// "ألغتها هي" = ملغاة بدون إلغاء تلقائي ولا من المصوّرة (رفض أو إلغاء المصوّرة لا يُحسب على العروس)
export const getClientHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { booking_id: string }) => {
    if (!d || !UUID_RE.test(d.booking_id ?? "")) throw new Error("invalid booking_id");
    return d;
  })
  .handler(async ({ data, context }) => {
    await ownBooking(context, data.booking_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data: me } = await admin.from("bookings").select("client_phone").eq("id", data.booking_id).maybeSingle();
    if (!me?.client_phone) return null;
    const { data: rows } = await admin.from("bookings")
      .select("id, photographer_id, status, auto_cancel_kind, cancelled_by, deposit_sent_at, deposit_confirmed_at")
      .eq("client_phone", me.client_phone).neq("id", data.booking_id).is("deleted_at", null)
      .gte("created_at", new Date(Date.now() - 365 * 86400000).toISOString()).limit(200);
    const list = (rows ?? []) as any[];
    const brideCancelled = list.filter((b) => b.status === "cancelled" && !b.auto_cancel_kind && b.cancelled_by !== b.photographer_id);
    return {
      completed: list.filter((b) => b.status === "completed").length,
      bride_cancelled: brideCancelled.length,
      bride_cancelled_after_deposit: brideCancelled.filter((b) => b.deposit_sent_at || b.deposit_confirmed_at).length,
    };
  });

// ----- العروس: "إيميلي غلط" — طلب تصحيح يصل للإدارة (ما نغيّره مباشرة لأن رموز الأمان تصل عليه،
// ورابط المتابعة تعرفه المصوّرة أيضاً). الإدارة تتأكد بالهاتف ثم تصحّحه.
export const requestEmailFix = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; email: string }) => {
    if (!d || !TOKEN_RE.test(d.token ?? "")) throw new Error("invalid token");
    const email = String(d.email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) throw new Error(tr("اكتبي إيميلاً صحيحاً"));
    return { token: d.token, email };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data: bk } = await admin.from("bookings")
      .select("id, client_name, client_email, client_phone, deleted_at").eq("client_tracking_token", data.token).maybeSingle();
    if (!bk || bk.deleted_at) throw new Error(tr("الحجز غير موجود"));
    const { allow } = await import("@/lib/abuse.server");
    if (!(await allow(`tok:${data.token}`, "email_fix", 3, 86400))) throw new Error(tr("وصلنا طلبكِ ونراجعه الآن"));
    const { error } = await admin.from("contact_messages").insert({
      name: bk.client_name || "عروس", email: data.email, phone: bk.client_phone,
      message: `طلب تصحيح إيميل لحجز ${bk.id}\nالإيميل المسجّل: ${bk.client_email ?? "—"}\nالإيميل الصحيح: ${data.email}\n(تأكّدي بالهاتف قبل التعديل)`,
    });
    if (error) throw new Error(error.message);
    try {
      const { data: admins } = await admin.from("user_roles").select("user_id").eq("role", "admin");
      if (admins?.length) await admin.from("notifications").insert(admins.map((a: any) => ({
        user_id: a.user_id, type: "system", title: "✉️ طلب تصحيح إيميل عروس", body: `${bk.client_name} · ${bk.client_phone ?? ""}`, link: "/admin/contact-messages",
      })));
    } catch (e) { console.error("[email-fix] notify failed", e); }
    return { ok: true };
  });
