// ============================================================================
// notify.server.ts — إشعارات مسار الحجز للطرفين على كل القنوات المتاحة
// ----------------------------------------------------------------------------
// المصوّرة: إشعار داخل الموقع + إيميل حسابها + تيليغرام (إن ربطته).
// العروس:   إيميل + واتساب (إن كان مهيّأً) + إشعار داخل الموقع إن كان لها حساب.
// لا ترمي أخطاء أبداً: فشل قناة لا يوقف تدفق الحجز.
// ============================================================================

import { appBase } from "@/lib/verification.server";

type PhotographerMsg = {
  title: string;
  body: string;
  /** مسار داخل الموقع، مثل /dashboard/bookings/<id> */
  link: string;
  template: string;
  bookingId?: string;
  /** سطور إضافية للإيميل فقط */
  emailLines?: string[];
  /** false عندما يكون إشعار الموقع قد أُدرج مسبقاً (مثلاً من دالة SQL) */
  inApp?: boolean;
};

export async function notifyPhotographer(photographerId: string, msg: PhotographerMsg) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const url = `${appBase()}${msg.link}`;

  if (msg.inApp !== false) {
    try {
      await supabaseAdmin.from("notifications").insert({
        user_id: photographerId, title: msg.title, body: msg.body, link: msg.link,
      });
    } catch (e) { console.error("[notify] in-app failed", e); }
  }

  try {
    const { sendTelegramToPhotographer } = await import("@/lib/telegram.server");
    await sendTelegramToPhotographer(photographerId, `<b>${escapeHtml(msg.title)}</b>\n${escapeHtml(msg.body)}\n\n${url}`);
  } catch (e) { console.error("[notify] telegram failed", e); }

  try {
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(photographerId);
    const to = u?.user?.email;
    if (to) {
      const { sendEmail, tplMessage } = await import("@/lib/email.server");
      const t = tplMessage({
        subject: msg.title, title: msg.title,
        lines: [msg.body, ...(msg.emailLines ?? [])],
        cta: { label: "فتح الحجز", url },
      });
      await sendEmail({
        to, subject: t.subject, html: t.html, template: msg.template,
        related_booking_id: msg.bookingId ?? null, related_user_id: photographerId,
      });
    }
  } catch (e) { console.error("[notify] photographer email failed", e); }
}

type BrideMsg = {
  subject: string;
  title: string;
  lines: string[];
  template: string;
  /** نص زر الإيميل؛ الرابط دائماً صفحة متابعة الحجز ما لم يُحدَّد ctaUrl */
  ctaLabel?: string;
  ctaUrl?: string;
};

export async function notifyBride(bookingId: string, msg: BrideMsg) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: b } = await supabaseAdmin.from("bookings")
    .select("id, client_email, client_phone, client_user_id, client_tracking_token")
    .eq("id", bookingId).maybeSingle();
  if (!b) return;
  const trackUrl = b.client_tracking_token ? `${appBase()}/track/${b.client_tracking_token}` : appBase();
  const ctaUrl = msg.ctaUrl ?? trackUrl;

  if (b.client_email) {
    try {
      const { sendEmail, tplMessage } = await import("@/lib/email.server");
      const t = tplMessage({
        subject: msg.subject, title: msg.title, lines: msg.lines,
        cta: { label: msg.ctaLabel ?? "متابعة الحجز", url: ctaUrl },
      });
      await sendEmail({ to: b.client_email, subject: t.subject, html: t.html, template: msg.template, related_booking_id: b.id });
    } catch (e) { console.error("[notify] bride email failed", e); }
  }

  if (b.client_phone) {
    try {
      const { sendWhatsAppText } = await import("@/lib/whatsapp.server");
      await sendWhatsAppText(b.client_phone, [`*${msg.title}*`, "", ...msg.lines, "", trackUrl].join("\n"));
    } catch (e) { console.error("[notify] bride whatsapp failed", e); }
  }

  if (b.client_user_id) {
    try {
      await supabaseAdmin.from("notifications").insert({
        user_id: b.client_user_id, title: msg.title, body: msg.lines[0] ?? "",
        link: b.client_tracking_token ? `/track/${b.client_tracking_token}` : "/",
      });
    } catch (e) { console.error("[notify] bride in-app failed", e); }
  }
}

function escapeHtml(s: string) {
  return String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
}
