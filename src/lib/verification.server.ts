// ============================================================================
// verification.server.ts — تأكيد طلب الحجز قبل أن يُحسب (خادمي فقط)
// ----------------------------------------------------------------------------
// قناتان:
//   * واتساب (مجاني): العروس ترسل رسالة جاهزة فيها verify_code_wa من نفس الرقم
//     الذي حجزت به → webhook /api/public/hooks/whatsapp يطابق الرقم ويؤكد.
//   * الإيميل: نرسل verify_code_email وتكتبه العروس في صفحة الحجز.
// إذا لم تُضبط أي قناة (لا واتساب ولا إيميل) يُؤكَّد الطلب تلقائياً حتى لا
// تتعطل الحجوزات.
// ============================================================================

export const VERIFY_WINDOW_MINUTES = 30;

export function sixDigits(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(n).padStart(6, "0");
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/** رقم واتساب المنصة الذي ترسل إليه العروس (أرقام فقط بصيغة دولية). */
export function publicWhatsAppNumber(): string | null {
  const raw = process.env.WHATSAPP_PUBLIC_NUMBER || "";
  const digits = raw.replace(/\D/g, "").replace(/^00/, "");
  return digits.length >= 8 && process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_ID ? digits : null;
}

/** آخر 9 أرقام — يطابق 0791234567 و +962791234567 و 00962791234567. */
export function phoneKey(phone: string | null | undefined): string {
  return (phone || "").replace(/\D/g, "").slice(-9);
}

export function appBase(): string {
  return process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
}

/**
 * يعلّم الحجز مؤكَّداً (مرة واحدة فقط) ثم يُبلغ المصوّرة ويرسل للعروس رابط التتبع.
 * يُعيد false إن كان مؤكداً مسبقاً.
 */
export async function markBookingVerified(bookingId: string, via: "whatsapp" | "email" | "auto"): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: updated } = await supabaseAdmin
    .from("bookings")
    .update({
      phone_verified_at: new Date().toISOString(),
      verified_via: via,
      verify_code_wa: null,
      verify_code_email: null,
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", bookingId)
    .is("phone_verified_at" as any, null)
    .select("id")
    .maybeSingle();
  if (!updated) return false;
  await notifyNewBooking(bookingId, via);
  return true;
}

/** إشعارات الطلب الجديد — تُرسل فقط بعد التأكيد حتى لا يصل السبام للمصوّرة. */
async function notifyNewBooking(bookingId: string, via: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: b } = await supabaseAdmin
    .from("bookings")
    .select("id, photographer_id, client_name, client_email, client_phone, event_date, start_time, total_price, deposit_amount, client_tracking_token, service, venue_address, addons")
    .eq("id", bookingId)
    .maybeSingle();
  if (!b) return;
  const { data: profile } = await supabaseAdmin
    .from("profiles").select("display_name, username").eq("id", b.photographer_id).maybeSingle();
  const photographerName = profile?.display_name || profile?.username || "المصوّرة";
  const addons = (Array.isArray(b.addons) ? b.addons : []) as any[];
  const main = addons.find((x) => x?.kind === "main");
  const summaryLabel = `${main?.label ?? "باقة"}${addons.length > 1 ? ` +${addons.length - 1} إضافات` : ""}`;
  const trackingUrl = b.client_tracking_token ? `${appBase()}/track/${b.client_tracking_token}` : undefined;
  const total = Number(b.total_price ?? 0);
  const deposit = Number(b.deposit_amount ?? 0);

  await supabaseAdmin.from("notifications").insert({
    user_id: b.photographer_id,
    title: "طلب حجز جديد",
    body: `${b.client_name} يرغب بحجز ${summaryLabel} بتاريخ ${b.event_date}`,
    link: `/dashboard/bookings/${b.id}`,
  });

  // للعروس: عند التأكيد عبر واتساب يرد الـ webhook برابط التتبع مباشرة (مجاني
  // داخل نافذة الـ 24 ساعة)، فلا نرسل رسالة الترحيب المدفوعة هنا.
  if (via !== "whatsapp" && b.client_phone) {
    try {
      const { sendWhatsAppNotification } = await import("@/lib/whatsapp.server");
      await sendWhatsAppNotification(b.photographer_id, b.client_phone, "welcome", {
        client_name: b.client_name,
        photographer_name: photographerName,
        event_date: String(b.event_date),
        deposit_amount: deposit > 0 ? String(deposit) : undefined,
        total_price: total > 0 ? String(total) : undefined,
        service: main?.label,
        tracking_url: trackingUrl,
        venue: b.venue_address ?? undefined,
      });
    } catch (e) { console.error("[verify] welcome WhatsApp failed", e); }
  }

  try {
    const { sendEmail, tplNewBookingForPhotographer, tplBookingReceivedForClient } = await import("@/lib/email.server");
    const { data: pUser } = await supabaseAdmin.auth.admin.getUserById(b.photographer_id);
    const photographerEmail = pUser?.user?.email;
    if (photographerEmail) {
      const t1 = tplNewBookingForPhotographer({
        photographer_name: photographerName,
        client_name: b.client_name,
        service_label: summaryLabel,
        event_date: String(b.event_date),
        start_time: String(b.start_time),
        total,
        booking_id: b.id,
      });
      await sendEmail({
        to: photographerEmail, subject: t1.subject, html: t1.html,
        template: "new_booking_photographer",
        related_booking_id: b.id, related_user_id: b.photographer_id,
      });
    }
    if (b.client_email) {
      const t2 = tplBookingReceivedForClient({
        client_name: b.client_name,
        photographer_name: photographerName,
        event_date: String(b.event_date),
        total, deposit,
        track_token: b.client_tracking_token!,
      });
      await sendEmail({
        to: b.client_email, subject: t2.subject, html: t2.html,
        template: "booking_received_client", related_booking_id: b.id,
      });
    }
  } catch (e) { console.error("[verify] notification emails failed", e); }
}

/** يرسل رمز الإيميل للعروس. */
export async function sendEmailCode(args: { to: string; client_name: string; code: string; booking_id: string }) {
  const { sendEmail } = await import("@/lib/email.server");
  const html = `
    <div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#222">
      <h2 style="margin:0 0 12px">رمز تأكيد حجزك</h2>
      <p>مرحباً ${escapeHtml(args.client_name)}،</p>
      <p>لتأكيد طلب الحجز على ميموريا، أدخلي هذا الرمز في صفحة الحجز:</p>
      <div style="font-size:32px;letter-spacing:8px;font-weight:bold;text-align:center;background:#f6f1e7;border-radius:8px;padding:16px;margin:16px 0">${args.code}</div>
      <p style="color:#777;font-size:13px">الرمز صالح لمدة ${VERIFY_WINDOW_MINUTES} دقيقة. إذا لم تطلبي حجزاً تجاهلي هذه الرسالة.</p>
    </div>`;
  return sendEmail({
    to: args.to, subject: `رمز تأكيد حجزك: ${args.code}`, html,
    template: "booking_verify_code", related_booking_id: args.booking_id,
  });
}

function escapeHtml(s: string) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
