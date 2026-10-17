import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizePhone, isEmail, PHONE_HINT, EMAIL_HINT } from "./validation";

// ============================================================================
// negotiation.functions.ts — اقتراح سعر أقل من العروس
// ----------------------------------------------------------------------------
// قواعد:
//   * العرض لا يُنشئ حجزاً ولا يحجب الموعد؛ فقط يُفحص التوفّر وقت الإرسال.
//   * السعر المُدرج يُقرأ من قاعدة البيانات (لا يُوثق بالمتصفح).
//   * عند القبول يُنشأ الحجز الفعلي بالسعر المعروض عبر create_booking_guarded.
// ============================================================================

const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;
const MAX_PENDING_PER_CLIENT = 3;

type OfferInput = {
  photographer_id: string;
  rule_id: string;
  offered_price: number;
  client_name: string;
  client_email: string;
  client_phone: string;
  event_date: string;
  start_time: string;
  end_time: string;
  venue_address?: string | null;
  client_notes?: string | null;
};

function validateOffer(d: OfferInput): OfferInput {
  const isUuid = (s: any) => typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s);
  const isDate = (s: any) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const isTime = (s: any) => typeof s === "string" && /^\d{2}:\d{2}(:\d{2})?$/.test(s);
  if (!d || typeof d !== "object") throw new Error("invalid payload");
  if (!isUuid(d.photographer_id)) throw new Error("invalid photographer_id");
  if (!isUuid(d.rule_id)) throw new Error("باقة غير صالحة");
  if (typeof d.offered_price !== "number" || !Number.isFinite(d.offered_price) || d.offered_price <= 0) {
    throw new Error("اكتبي السعر الذي تقترحينه");
  }
  d.offered_price = Math.round(d.offered_price * 1000) / 1000;
  if (!d.client_name || typeof d.client_name !== "string" || d.client_name.length > 120) throw new Error("اكتبي اسمكِ الكامل");
  if (!isEmail(d.client_email)) throw new Error(EMAIL_HINT);
  d.client_email = d.client_email.trim();
  const phone = normalizePhone(d.client_phone ?? "");
  if (!phone) throw new Error(PHONE_HINT);
  d.client_phone = phone;
  if (!isDate(d.event_date)) throw new Error("اختاري تاريخ المناسبة");
  if (!isTime(d.start_time) || !isTime(d.end_time)) throw new Error("اختاري وقت البداية والنهاية");
  const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return (h || 0) * 60 + (m || 0); };
  const duration = toMin(d.end_time) - toMin(d.start_time);
  if (duration <= 0) throw new Error("وقت الانتهاء يجب أن يكون بعد وقت البداية");
  if (duration < 30) throw new Error("الحد الأدنى لمدة الحجز هو 30 دقيقة");
  const todayStr = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().split("T")[0];
  if (d.event_date < todayStr) throw new Error("لا يمكن اختيار تاريخ في الماضي");
  if (d.venue_address && d.venue_address.length > 500) throw new Error("عنوان المكان طويل جداً");
  if (d.client_notes && d.client_notes.length > 4000) throw new Error("الملاحظات طويلة جداً");
  return d;
}

function appBase(): string {
  return process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

// Minimal RTL email layout on top of email.server's sender.
async function loadEmail() {
  const { sendEmail } = await import("@/lib/email.server");
  return {
    sendEmail,
    tplOfferEmail: (a: { title: string; subject: string; body: string; label: string; url: string }) => ({
      subject: a.subject,
      html: `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a;line-height:1.8;">
        <h2 style="font-family:Georgia,serif;">${a.title}</h2>${a.body}
        <p style="margin-top:24px;"><a href="${a.url}" style="background:#1a1a1a;color:#fff;padding:12px 22px;border-radius:4px;text-decoration:none;">${a.label}</a></p>
      </div>`,
    }),
  };
}

// ---------------------------------------------------------------- submit
export const submitPriceOffer = createServerFn({ method: "POST" })
  .inputValidator((d: OfferInput) => validateOffer(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin: any = supabaseAdmin;

    const { data: subActive } = await admin.rpc("is_subscription_active", { _photographer_id: data.photographer_id });
    if (!subActive) throw new Error("نعتذر، لا يمكن إرسال العرض لأن اشتراك المصورة غير نشط حالياً.");

    const { data: rule } = await admin
      .from("pricing_rules").select("id, photographer_id, label, price, service, package")
      .eq("id", data.rule_id).maybeSingle();
    if (!rule || rule.photographer_id !== data.photographer_id || rule.package === "addon") throw new Error("باقة غير صالحة");

    const listed = Number(rule.price);
    if (!(listed > 0)) throw new Error("باقة غير صالحة");
    if (data.offered_price >= listed) throw new Error("السعر المقترح يجب أن يكون أقل من السعر المعلن");
    if (data.offered_price < listed * 0.5) {
      throw new Error(`أقل سعر يمكن اقتراحه هو ${Math.ceil(listed * 0.5)} د.أ (نصف السعر المعلن)`);
    }

    const { count } = await admin.from("price_offers").select("id", { count: "exact", head: true })
      .eq("photographer_id", data.photographer_id).eq("client_email", data.client_email)
      .eq("status", "pending").gt("expires_at", new Date().toISOString());
    if ((count ?? 0) >= MAX_PENDING_PER_CLIENT) {
      throw new Error("لديكِ عدة عروض معلّقة لدى هذه المصوّرة. انتظري ردّها قبل إرسال عرض جديد.");
    }

    // فحص التوفّر دون حجز الموعد
    const { data: busy } = await admin.rpc("is_photographer_busy", { _pid: data.photographer_id, _date: data.event_date });
    if (busy === true) throw new Error("هذا اليوم غير متاح، يرجى اختيار يوم آخر");
    const { data: conflict } = await admin.rpc("has_booking_conflict", {
      _pid: data.photographer_id, _date: data.event_date, _start: data.start_time, _end: data.end_time, _exclude: null,
    });
    if (conflict === true) throw new Error("هذا الوقت محجوز، يرجى اختيار وقت آخر");

    const { data: row, error } = await admin.from("price_offers").insert({
      photographer_id: data.photographer_id,
      rule_id: rule.id,
      package_label: rule.label,
      service: rule.service,
      listed_price: listed,
      offered_price: data.offered_price,
      client_name: data.client_name.trim(),
      client_email: data.client_email,
      client_phone: data.client_phone,
      event_date: data.event_date,
      start_time: data.start_time,
      end_time: data.end_time,
      venue_address: data.venue_address || null,
      client_notes: data.client_notes || null,
    }).select("id, token").single();
    if (error || !row) throw new Error(error?.message || "تعذّر إرسال العرض");

    // إشعار المصوّرة — best-effort
    try {
      await admin.from("notifications").insert({
        user_id: data.photographer_id,
        title: "عرض سعر جديد",
        body: `${data.client_name} تقترح ${data.offered_price} د.أ بدل ${listed} د.أ لباقة ${rule.label} بتاريخ ${data.event_date}`,
        link: "/dashboard/offers",
      });
      const { sendEmail, tplOfferEmail } = await loadEmail();
      const { data: pUser } = await admin.auth.admin.getUserById(data.photographer_id);
      const to = pUser?.user?.email;
      if (to) {
        const t = tplOfferEmail({
          title: "عرض سعر جديد 💬",
          subject: `عرض سعر جديد من ${data.client_name}`,
          body: `<p>${esc(data.client_name)} تقترح <strong>${data.offered_price} د.أ</strong> بدل ${listed} د.أ لباقة <strong>${esc(rule.label)}</strong> بتاريخ ${esc(data.event_date)}.</p><p>لن يُحجز الموعد قبل موافقتك. العرض صالح ٣ أيام.</p>`,
          label: "مراجعة العرض",
          url: `${appBase()}/dashboard/offers`,
        });
        await sendEmail({ to, subject: t.subject, html: t.html, template: "price_offer_photographer", related_user_id: data.photographer_id });
      }
    } catch (e) { console.error("[offer] notify failed", e); }

    return { token: row.token as string };
  });

// ----------------------------------------------------------------- public
export const getOfferByToken = createServerFn({ method: "GET" })
  .inputValidator((d: { token: string }) => {
    if (!d || typeof d.token !== "string" || !TOKEN_RE.test(d.token)) throw new Error("invalid token");
    return d;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin: any = supabaseAdmin;
    const { data: o } = await admin.from("price_offers").select("*").eq("token", data.token).maybeSingle();
    if (!o) return null;
    const { data: prof } = await admin.from("profiles").select("display_name, username").eq("id", o.photographer_id).maybeSingle();
    let trackingToken: string | null = null;
    if (o.status === "accepted" && o.booking_id) {
      const { data: b } = await admin.from("bookings").select("client_tracking_token").eq("id", o.booking_id).maybeSingle();
      trackingToken = b?.client_tracking_token ?? null;
    }
    const status = o.status === "pending" && new Date(o.expires_at).getTime() < Date.now() ? "expired" : o.status;
    return {
      status: status as "pending" | "accepted" | "declined" | "expired",
      package_label: o.package_label as string,
      listed_price: Number(o.listed_price),
      offered_price: Number(o.offered_price),
      event_date: o.event_date as string,
      photographer_name: (prof?.display_name || prof?.username || "") as string,
      photographer_username: (prof?.username ?? null) as string | null,
      photographer_note: (o.photographer_note ?? null) as string | null,
      tracking_token: trackingToken,
    };
  });

// ------------------------------------------------------------ photographer
export const listMyOffers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context as any;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any).from("price_offers").select("*")
      .eq("photographer_id", userId).order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    const now = Date.now();
    return ((data ?? []) as any[]).map((o) => ({
      ...o,
      listed_price: Number(o.listed_price),
      offered_price: Number(o.offered_price),
      status: o.status === "pending" && new Date(o.expires_at).getTime() < now ? "expired" : o.status,
    })) as any[];
  });

export const respondToOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; action: "accept" | "decline"; note?: string | null }) => {
    if (!d || typeof d.id !== "string" || !/^[0-9a-f-]{36}$/i.test(d.id)) throw new Error("invalid id");
    if (d.action !== "accept" && d.action !== "decline") throw new Error("invalid action");
    if (d.note && (typeof d.note !== "string" || d.note.length > 1000)) throw new Error("الملاحظة طويلة جداً");
    return { id: d.id, action: d.action, note: d.note?.trim() || null };
  })
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin: any = supabaseAdmin;

    const { data: o } = await admin.from("price_offers").select("*").eq("id", data.id).maybeSingle();
    if (!o || o.photographer_id !== userId) throw new Error("العرض غير موجود");
    if (o.status !== "pending") throw new Error("تم الرد على هذا العرض مسبقاً");
    if (new Date(o.expires_at).getTime() < Date.now()) throw new Error("انتهت صلاحية هذا العرض");

    const { data: prof } = await admin.from("profiles")
      .select("id, display_name, username, fixed_deposit, deposit_percent").eq("id", userId).maybeSingle();
    if (!prof) throw new Error("الحساب غير موجود");
    const photographerName = prof.display_name || prof.username || "المصوّرة";
    const offerUrl = `${appBase()}/offer/${o.token}`;
    const now = new Date().toISOString();

    const emailClient = async (subject: string, title: string, body: string, label: string, url: string) => {
      try {
        const { sendEmail, tplOfferEmail } = await loadEmail();
        const t = tplOfferEmail({ title, subject, body, label, url });
        await sendEmail({ to: o.client_email, subject: t.subject, html: t.html, template: "price_offer_client", related_user_id: userId });
      } catch (e) { console.error("[offer] client email failed", e); }
    };

    if (data.action === "decline") {
      await admin.from("price_offers").update({ status: "declined", photographer_note: data.note, responded_at: now }).eq("id", o.id).eq("status", "pending");
      await emailClient(
        `ردّ ${photographerName} على عرضكِ`, "ردّ على عرضكِ",
        `<p>مرحباً ${esc(o.client_name)}،</p><p>شكراً لاهتمامكِ. تعذّرت موافقة ${esc(photographerName)} على السعر المقترح لباقة ${esc(o.package_label)}.</p>${data.note ? `<p>ملاحظة المصوّرة: ${esc(data.note)}</p>` : ""}<p>يمكنكِ الحجز بالسعر المعلن من صفحتها.</p>`,
        "عرض التفاصيل", offerUrl,
      );
      return { ok: true, status: "declined" as const };
    }

    // قبول: إنشاء الحجز الفعلي بالسعر المعروض
    const price = Number(o.offered_price);
    const deposit = price > 0
      ? (prof.fixed_deposit != null ? Number(prof.fixed_deposit) : Math.round(price * (Number(prof.deposit_percent ?? 25) / 100)))
      : 0;
    const { data: created, error } = await admin.rpc("create_booking_guarded", {
      _payload: {
        photographer_id: userId,
        client_name: o.client_name,
        client_email: o.client_email,
        client_phone: o.client_phone,
        service: o.service,
        event_date: o.event_date,
        start_time: o.start_time,
        end_time: o.end_time,
        venue_address: o.venue_address ?? null,
        base_price: price,
        total_price: price,
        deposit_amount: deposit,
        privacy_level: "public",
        photographer_can_publish: true,
        client_notes: o.client_notes ?? null,
        addons: [{ rule_id: o.rule_id, label: o.package_label, price, qty: 1, kind: "main" }],
      },
    });
    if (error) {
      const msg = error.message || "";
      if (msg.includes("SLOT_CONFLICT")) throw new Error("لديكِ حجز آخر في هذا الوقت، لا يمكن قبول العرض. العرض ما زال معلّقاً.");
      if (msg.includes("DAY_UNAVAILABLE")) throw new Error("هذا اليوم مغلق في تقويمكِ، لا يمكن قبول العرض. العرض ما زال معلّقاً.");
      throw new Error(msg);
    }
    const bookingId = (created as any).booking_id as string;
    const trackingToken = (created as any).tracking_token as string;

    // المصوّرة زكّت العرض، فالحجز موثّق تلقائياً
    try {
      const { markBookingVerified } = await import("@/lib/verification.server");
      await markBookingVerified(bookingId, "auto");
    } catch (e) { console.error("[offer] verify failed", e); }

    await admin.from("price_offers").update({
      status: "accepted", booking_id: bookingId, photographer_note: data.note, responded_at: now,
    }).eq("id", o.id);

    try {
      await admin.from("audit_logs").insert({
        action: "booking.offer_accepted", actor_id: userId, entity_type: "booking", entity_id: bookingId,
        after_data: { offer_id: o.id, listed: Number(o.listed_price), offered: price },
      } as any);
    } catch (e) { console.error("[offer] audit failed", e); }

    await emailClient(
      `وافقت ${photographerName} على عرضكِ 🎉`, "تمت الموافقة على عرضكِ",
      `<p>مرحباً ${esc(o.client_name)}،</p><p>وافقت ${esc(photographerName)} على سعركِ <strong>${price} د.أ</strong> لباقة ${esc(o.package_label)} بتاريخ ${esc(String(o.event_date))}. العربون المطلوب: <strong>${deposit} د.أ</strong>.</p><p>تابعي الحجز وأرسلي العربون من رابط التتبّع:<br><a href="${appBase()}/track/${trackingToken}">${appBase()}/track/${trackingToken}</a></p><p>صفحة العرض: <a href="${offerUrl}">${offerUrl}</a></p>`,
      "متابعة الحجز", `${appBase()}/track/${trackingToken}`,
    );

    return { ok: true, status: "accepted" as const, booking_id: bookingId, tracking_token: trackingToken };
  });
