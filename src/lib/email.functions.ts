import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const isUuid = (s: any) => typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s);

// Sends "your gallery is ready" email — called by the photographer's dashboard
// when she marks the booking as delivered.
export const sendGalleryDeliveredEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { booking_id: string }) => {
    if (!isUuid(d?.booking_id)) throw new Error("invalid booking_id");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendEmail, tplGalleryDelivered } = await import("@/lib/email.server");

    const { data: bk } = await supabaseAdmin
      .from("bookings")
      .select("id, photographer_id, client_email, client_name, client_tracking_token")
      .eq("id", data.booking_id)
      .maybeSingle();
    if (!bk) throw new Error("booking not found");
    if (bk.photographer_id !== context.userId) throw new Error("forbidden");
    if (!bk.client_email) return { ok: false, reason: "no client email" };

    const { data: prof } = await supabaseAdmin
      .from("profiles").select("display_name").eq("id", bk.photographer_id).maybeSingle();

    const tpl = tplGalleryDelivered({
      client_name: bk.client_name || "عميلتنا",
      photographer_name: prof?.display_name || "المصوّرة",
      track_token: bk.client_tracking_token!,
    });
    return await sendEmail({
      to: bk.client_email, subject: tpl.subject, html: tpl.html,
      template: "gallery_delivered", related_booking_id: bk.id,
    });
  });
// ============================================================================
// sendGalleryDeliveredEmail — إيميل تسليم الصور (يُستدعى من updateProductionStage)
// ============================================================================
export const sendGalleryDeliveredEmail = createServerFn({ method: "POST" })
  .inputValidator((d: { booking_id: string }) => {
    if (!d || typeof d.booking_id !== "string" || !/^[0-9a-f-]{36}$/i.test(d.booking_id)) {
      throw new Error("invalid booking_id");
    }
    return d;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendEmail } = await import("@/lib/email.server");

    const { data: bk } = await supabaseAdmin
      .from("bookings")
      .select("id, client_email, client_name, event_date, client_tracking_token, photographer_id, selection_link")
      .eq("id", data.booking_id)
      .maybeSingle();

    if (!bk?.client_email) return { ok: false, reason: "no_client_email" };

    // منع إعادة الإرسال (idempotency)
    const { data: prior } = await supabaseAdmin
      .from("email_log")
      .select("id")
      .eq("template", "gallery_delivered")
      .eq("related_booking_id", data.booking_id)
      .eq("status", "sent")
      .limit(1);
    if (prior && prior.length > 0) return { ok: true, skipped: true };

    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("display_name")
      .eq("id", bk.photographer_id)
      .maybeSingle();

    const base = process.env.PUBLIC_APP_URL || "https://elitecapture.com";
    const trackUrl = bk.client_tracking_token ? `${base}/track/${bk.client_tracking_token}` : null;
    const reviewUrl = bk.client_tracking_token ? `${base}/review/${bk.client_tracking_token}` : null;

    const photographerName = prof?.display_name || "المصوّرة";
    const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f7f5f1;font-family:Tahoma,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#fff;border:1px solid #e6e2d8;border-radius:4px;overflow:hidden;">
        <tr><td style="padding:24px 28px;border-bottom:1px solid #efece4;">
          <div style="font-family:Georgia,serif;font-size:22px;color:#a07a32;">EliteCapture</div>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="font-family:Georgia,serif;font-size:22px;margin:0 0 16px;">صورك جاهزة! 🎉</h1>
          <p>مرحباً ${bk.client_name || "عميلتنا"},</p>
          <p>يسعدنا إعلامك بأن صور حجزك مع <strong>${photographerName}</strong> بتاريخ <strong>${bk.event_date}</strong> أصبحت جاهزة!</p>
          ${bk.selection_link ? `<p style="margin:16px 0;"><a href="${bk.selection_link}" style="background:#a07a32;color:#fff;text-decoration:none;padding:12px 24px;border-radius:3px;display:inline-block;">عرض الصور</a></p>` : ''}
          ${trackUrl ? `<p style="font-size:13px;color:#7a7466;">يمكنك متابعة تفاصيل حجزك من هنا: <a href="${trackUrl}" style="color:#a07a32;">${trackUrl}</a></p>` : ''}
          ${reviewUrl ? `<p style="margin-top:20px;padding:16px;background:#faf8f3;border-radius:4px;font-size:13px;">نتمنى أنك راضية عن التجربة! <a href="${reviewUrl}" style="color:#a07a32;font-weight:600;">اتركي تقييمك هنا</a> — رأيك يساعد العرائس الأخريات.</p>` : ''}
        </td></tr>
        <tr><td style="padding:16px 28px;background:#faf8f3;border-top:1px solid #efece4;font-size:11px;color:#8a8472;text-align:center;">
          رسالة آلية من EliteCapture — لا داعي للرد مباشرة.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    const result = await sendEmail({
      to: bk.client_email,
      subject: `صورك جاهزة مع ${photographerName}! ✨`,
      html,
      template: "gallery_delivered",
      related_booking_id: data.booking_id,
    });

    return { ok: result.ok };
  });
