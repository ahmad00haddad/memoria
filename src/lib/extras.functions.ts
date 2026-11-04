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
  .inputValidator((d: { booking_id: string; description: string; amount: number }) => {
    if (!d || !UUID_RE.test(d.booking_id ?? "")) throw new Error("invalid booking_id");
    const description = String(d.description ?? "").trim();
    if (description.length < 2) throw new Error(tr("اكتبي ما الذي اتفقتما عليه"));
    if (description.length > 1000) throw new Error(tr("الوصف طويل جداً"));
    const amount = Number(d.amount || 0);
    if (!Number.isFinite(amount) || amount < 0 || amount > 100000) throw new Error(tr("المبلغ غير صحيح"));
    return { booking_id: d.booking_id, description, amount: Math.round(amount * 100) / 100 };
  })
  .handler(async ({ data, context }) => {
    const bk = await ownBooking(context, data.booking_id);
    if (bk.status !== "confirmed" && bk.status !== "completed") throw new Error(tr("الملحق متاح بعد تأكيد الحجز"));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // سقف حماية للعروس: مجموع الملاحق (المعلّقة + الموافَق عليها) لا يتجاوز نصف سعر الباقة (حد أدنى 100 د.أ)،
    // وملحقات معلّقة قليلة؛ أي زيادة أكبر تحتاج حجزاً جديداً أو دعماً.
    const { data: existing } = await (supabaseAdmin as any).from("booking_addenda")
      .select("amount, status").eq("booking_id", bk.id).in("status", ["pending", "accepted"]);
    const open = (existing ?? []) as { amount: number; status: string }[];
    if (open.filter((x) => x.status === "pending").length >= 3) {
      throw new Error(tr("عندكِ 3 ملاحق بانتظار موافقة العروس. انتظري ردّها قبل إضافة غيرها."));
    }
    const cap = Math.max(100, Number(bk.base_price ?? 0) * 0.5);
    const sum = open.reduce((s, x) => s + Number(x.amount || 0), 0) + data.amount;
    if (sum > cap) {
      throw new Error(tr("مجموع الملاحق على هذا الحجز لا يتجاوز {0} د.أ (نصف سعر الباقة). للمبالغ الأكبر تواصلي مع فريق ميموريا.", [Math.round(cap)]));
    }
    const { error } = await (supabaseAdmin as any).from("booking_addenda")
      .insert({ booking_id: bk.id, description: data.description, amount: data.amount });
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
            data.amount > 0 ? `المبلغ الإضافي: ${data.amount} د.أ (يُضاف إلى المتبقي).` : "بدون مبلغ إضافي.",
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
        .select("amount").eq("id", data.id).eq("booking_id", bk.id).eq("status", "pending").maybeSingle();
      const { stepUpApplies, consumeStepUpCode } = await import("@/lib/stepup.server");
      if (pending && Number(pending.amount) > 0 && stepUpApplies(bk)) await consumeStepUpCode(bk.id, "addendum", data.code);
    }
    const { data: upd, error } = await supabaseAdmin.from("booking_addenda")
      .update({ status: data.accept ? "accepted" : "declined", responded_at: new Date().toISOString() })
      .eq("id", data.id).eq("booking_id", bk.id).eq("status", "pending")
      .select("amount").maybeSingle();
    if (error) throw new Error(error.message);
    if (!upd) throw new Error(tr("هذا الملحق لم يعد بانتظار ردّكِ"));
    if (data.accept && Number(upd.amount) > 0) {
      const { error: e2 } = await supabaseAdmin.from("bookings")
        .update({ total_price: Number(bk.total_price || 0) + Number(upd.amount) }).eq("id", bk.id);
      if (e2) throw new Error(e2.message);
    }
    return { ok: true };
  });

// بيانات الإضافات لصفحة العروس (تُدمج في getBookingByToken)
export async function extrasForToken(supabaseAdmin: any, bookingId: string) {
  const { data: gal } = await supabaseAdmin.from("delivery_galleries").select("id").eq("booking_id", bookingId).maybeSingle();
  const { count: photosDelivered } = gal
    ? await supabaseAdmin.from("delivery_photos").select("id", { count: "exact", head: true }).eq("gallery_id", gal.id)
    : { count: 0 };
  const [{ data: b }, { data: ad }] = await Promise.all([
    supabaseAdmin.from("bookings").select("ready_confirmed_at, event_day_info, privacy_level").eq("id", bookingId).maybeSingle(),
    supabaseAdmin.from("booking_addenda").select("id, description, amount, status, created_at, responded_at")
      .eq("booking_id", bookingId).neq("status", "withdrawn").order("created_at"),
  ]);
  return {
    ready_confirmed_at: b?.ready_confirmed_at ?? null,
    event_day_info: b?.event_day_info ?? null,
    privacy_level: b?.privacy_level ?? "public",
    addenda: ad ?? [],
    photos_delivered: photosDelivered ?? 0,
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
