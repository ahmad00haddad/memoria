// Server-only Resend email sender + Arabic RTL templates.
// Never import this file directly from client/route code — load via dynamic
// import inside server-fn or server-route handlers.

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  template: string;
  related_booking_id?: string | null;
  related_user_id?: string | null;
};

// ✅ إصلاح: يقرأ من env بدلاً من hardcoded — يجب ضبط EMAIL_FROM في Cloudflare/Supabase
// مثال: EMAIL_FROM="EliteCapture <noreply@elitecapture.com>"
// Fallback آمن للتطوير فقط — يذهب للـ spam في الإنتاج بدون domain موثّق
const FROM = process.env.EMAIL_FROM || "EliteCapture <onboarding@resend.dev>";

export async function sendEmail(args: SendArgs): Promise<{ ok: boolean; id?: string; error?: string; skipped?: boolean }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const apiKey = process.env.RESEND_API_KEY;

  // No API key → log as skipped, never throw (booking flow must keep working).
  if (!apiKey) {
    await supabaseAdmin.from("email_log").insert({
      template: args.template, recipient: args.to, subject: args.subject,
      related_booking_id: args.related_booking_id ?? null,
      related_user_id: args.related_user_id ?? null,
      status: "skipped", error: "RESEND_API_KEY not configured",
    });
    return { ok: false, skipped: true };
  }

  // Basic email validation
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(args.to)) {
    await supabaseAdmin.from("email_log").insert({
      template: args.template, recipient: args.to, subject: args.subject,
      related_booking_id: args.related_booking_id ?? null,
      status: "failed", error: "invalid recipient email",
    });
    return { ok: false, error: "invalid recipient" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: [args.to],
        subject: args.subject,
        html: args.html,
      }),
    });
    const body: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      await supabaseAdmin.from("email_log").insert({
        template: args.template, recipient: args.to, subject: args.subject,
        related_booking_id: args.related_booking_id ?? null,
        related_user_id: args.related_user_id ?? null,
        status: "failed", error: body?.message || `HTTP ${res.status}`,
      });
      return { ok: false, error: body?.message || `HTTP ${res.status}` };
    }
    await supabaseAdmin.from("email_log").insert({
      template: args.template, recipient: args.to, subject: args.subject,
      related_booking_id: args.related_booking_id ?? null,
      related_user_id: args.related_user_id ?? null,
      status: "sent", provider_id: body?.id ?? null,
    });
    return { ok: true, id: body?.id };
  } catch (e: any) {
    await supabaseAdmin.from("email_log").insert({
      template: args.template, recipient: args.to, subject: args.subject,
      related_booking_id: args.related_booking_id ?? null,
      related_user_id: args.related_user_id ?? null,
      status: "failed", error: String(e?.message || e),
    });
    return { ok: false, error: String(e?.message || e) };
  }
}

// ---------- Shared layout ----------
function layout(title: string, inner: string, cta?: { label: string; url: string }) {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
  <body style="margin:0;background:#f7f5f1;font-family:Tahoma,Arial,sans-serif;color:#1a1a1a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f1;padding:32px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #e6e2d8;border-radius:4px;overflow:hidden;">
          <tr><td style="padding:24px 28px;border-bottom:1px solid #efece4;">
            <div style="font-family:Georgia,serif;font-size:22px;color:#a07a32;letter-spacing:0.5px;">EliteCapture</div>
            <div style="font-size:12px;color:#7a7466;margin-top:4px;">منصة مصوّرات الأعراس والمناسبات</div>
          </td></tr>
          <tr><td style="padding:28px;">
            <h1 style="font-family:Georgia,serif;font-size:22px;margin:0 0 16px;color:#1a1a1a;">${escapeHtml(title)}</h1>
            <div style="font-size:15px;line-height:1.8;color:#2a2a2a;">${inner}</div>
            ${cta ? `<div style="margin-top:28px;text-align:center;">
              <a href="${escapeAttr(cta.url)}" style="display:inline-block;background:#a07a32;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:3px;font-size:14px;font-weight:600;">${escapeHtml(cta.label)}</a>
            </div>` : ""}
          </td></tr>
          <tr><td style="padding:16px 28px;background:#faf8f3;border-top:1px solid #efece4;font-size:11px;color:#8a8472;text-align:center;">
            هذه رسالة آلية من EliteCapture — لا داعي للرد عليها مباشرة.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}

function escapeHtml(s: string) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
function escapeAttr(s: string) { return escapeHtml(s).replace(/`/g, "&#96;"); }

function appBase(): string {
  // Used to build absolute URLs in emails. Falls back to published domain.
  return process.env.PUBLIC_APP_URL || "https://royal-lens-flow.lovable.app";
}

// ---------- Templates ----------
export function tplNewBookingForPhotographer(args: {
  photographer_name: string; client_name: string; service_label: string;
  event_date: string; start_time: string; total: number; booking_id: string;
}) {
  return {
    subject: `طلب حجز جديد من ${args.client_name}`,
    html: layout("طلب حجز جديد 🎉", `
      <p>مرحباً ${escapeHtml(args.photographer_name)},</p>
      <p>وصل طلب حجز جديد إلى حسابك:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
        <tr><td style="padding:8px 0;color:#7a7466;width:120px;">العميلة:</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(args.client_name)}</td></tr>
        <tr><td style="padding:8px 0;color:#7a7466;">الباقة:</td><td style="padding:8px 0;">${escapeHtml(args.service_label)}</td></tr>
        <tr><td style="padding:8px 0;color:#7a7466;">التاريخ:</td><td style="padding:8px 0;">${escapeHtml(args.event_date)} – ${escapeHtml(args.start_time)}</td></tr>
        <tr><td style="padding:8px 0;color:#7a7466;">الإجمالي:</td><td style="padding:8px 0;font-weight:600;color:#a07a32;">${args.total.toFixed(2)} د.أ</td></tr>
      </table>
      <p>راجعي الطلب فوراً وتأكدي من توفّر التاريخ.</p>`,
      { label: "فتح الحجز", url: `${appBase()}/dashboard/bookings/${args.booking_id}` }),
  };
}

export function tplBookingReceivedForClient(args: {
  client_name: string; photographer_name: string; event_date: string;
  total: number; deposit: number; track_token: string;
}) {
  return {
    subject: `تم استلام طلب حجزك مع ${args.photographer_name}`,
    html: layout("تم استلام طلب حجزك 💌", `
      <p>مرحباً ${escapeHtml(args.client_name)},</p>
      <p>استلمنا طلب حجزك مع <strong>${escapeHtml(args.photographer_name)}</strong> بتاريخ <strong>${escapeHtml(args.event_date)}</strong>.</p>
      <p>المبلغ الإجمالي: <strong>${args.total.toFixed(2)} د.أ</strong><br>
      العربون المطلوب لتثبيت الحجز: <strong style="color:#a07a32;">${args.deposit.toFixed(2)} د.أ</strong></p>
      <p>من صفحة المتابعة أدناه تجدين تفاصيل الدفع، يمكنك رفع إثبات التحويل، ومتابعة حالة الحجز خطوة بخطوة.</p>`,
      { label: "متابعة الحجز", url: `${appBase()}/track/${args.track_token}` }),
  };
}

export function tplDepositConfirmed(args: {
  client_name: string; photographer_name: string; event_date: string; track_token: string;
}) {
  return {
    subject: "تم تأكيد حجزك ✅",
    html: layout("تم تأكيد الحجز", `
      <p>مرحباً ${escapeHtml(args.client_name)},</p>
      <p>تم استلام العربون وتأكيد حجزك مع <strong>${escapeHtml(args.photographer_name)}</strong> بتاريخ <strong>${escapeHtml(args.event_date)}</strong>.</p>
      <p>سنرسل لك تذكيراً قبل موعد التصوير بـ 24 ساعة.</p>`,
      { label: "صفحة الحجز", url: `${appBase()}/track/${args.track_token}` }),
  };
}

export function tplEventReminder24h(args: {
  client_name: string; photographer_name: string; event_date: string;
  start_time: string; venue?: string | null; track_token: string;
}) {
  return {
    subject: "تذكير: موعد تصويرك غداً 📸",
    html: layout("تذكير بموعد التصوير", `
      <p>مرحباً ${escapeHtml(args.client_name)},</p>
      <p>هذا تذكير بأن موعد تصويرك مع <strong>${escapeHtml(args.photographer_name)}</strong> غداً بتاريخ <strong>${escapeHtml(args.event_date)}</strong> الساعة <strong>${escapeHtml(args.start_time)}</strong>.</p>
      ${args.venue ? `<p>الموقع: ${escapeHtml(args.venue)}</p>` : ""}
      <p>نتمنى لك يوماً لا يُنسى ✨</p>`,
      { label: "تفاصيل الحجز", url: `${appBase()}/track/${args.track_token}` }),
  };
}

export function tplGalleryDelivered(args: {
  client_name: string; photographer_name: string; track_token: string;
}) {
  return {
    subject: `صورك جاهزة من ${args.photographer_name} 🎞️`,
    html: layout("صورك جاهزة!", `
      <p>مرحباً ${escapeHtml(args.client_name)},</p>
      <p>سلّمت <strong>${escapeHtml(args.photographer_name)}</strong> معرض صورك. يمكنك مشاهدة الصور وتحميلها من الرابط أدناه.</p>`,
      { label: "فتح المعرض", url: `${appBase()}/track/${args.track_token}` }),
  };
}

export function tplSubscriptionExpiring(args: {
  photographer_name: string; days_left: number;
}) {
  return {
    subject: `اشتراكك ينتهي خلال ${args.days_left} أيام`,
    html: layout("تذكير بانتهاء الاشتراك", `
      <p>مرحباً ${escapeHtml(args.photographer_name)},</p>
      <p>ينتهي اشتراكك في EliteCapture خلال <strong>${args.days_left}</strong> أيام.</p>
      <p>جدّدي الاشتراك من لوحة التحكم لتجنّب توقّف ظهور ملفك في نتائج البحث.</p>`,
      { label: "تجديد الاشتراك", url: `${appBase()}/dashboard/subscription` }),
  };
}

export function tplBookingCancelled(args: {
  client_name: string; photographer_name: string; event_date: string;
  refund_amount: number; by: "photographer" | "client";
  track_token?: string; booking_id?: string;
}) {
  // عند الإلغاء من المصوّرة: رسالة للعميل (مع معلومات الاسترداد إن وُجدت).
  // عند الإلغاء من العميل: رسالة للمصوّرة (إشعار).
  if (args.by === "photographer") {
    const refundBlock = args.refund_amount > 0
      ? `<p>سيتم رد عربون بقيمة <strong style="color:#a07a32;">${args.refund_amount.toFixed(2)} د.أ</strong> حسب سياسة الاسترداد.</p>`
      : "";
    return {
      subject: "تم إلغاء حجزك",
      html: layout("تم إلغاء الحجز", `
        <p>مرحباً ${escapeHtml(args.client_name)},</p>
        <p>نأسف لإبلاغك بأنّه تم إلغاء حجزك مع <strong>${escapeHtml(args.photographer_name)}</strong> بتاريخ <strong>${escapeHtml(args.event_date)}</strong>.</p>
        ${refundBlock}
        <p>للاستفسار يمكنك متابعة صفحة الحجز أو التواصل مع المصوّرة.</p>`,
        args.track_token ? { label: "صفحة الحجز", url: `${appBase()}/track/${args.track_token}` } : undefined),
    };
  }
  return {
    subject: `ألغى ${args.client_name} طلب الحجز`,
    html: layout("ألغى العميل الحجز", `
      <p>مرحباً ${escapeHtml(args.photographer_name)},</p>
      <p>قام <strong>${escapeHtml(args.client_name)}</strong> بإلغاء طلب الحجز بتاريخ <strong>${escapeHtml(args.event_date)}</strong> قبل التأكيد. أصبح الموعد متاحاً مجدداً.</p>`,
      args.booking_id ? { label: "فتح الحجز", url: `${appBase()}/dashboard/bookings/${args.booking_id}` } : undefined),
  };
}