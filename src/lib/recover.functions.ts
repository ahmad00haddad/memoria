import { createServerFn } from "@tanstack/react-start";

export const recoverTrackingLinks = createServerFn({ method: "POST" })
  .inputValidator((d: { emailOrPhone: string }) => {
    if (!d || typeof d.emailOrPhone !== "string" || d.emailOrPhone.length < 5) {
      throw new Error("يرجى إدخال بريد إلكتروني أو رقم هاتف صحيح");
    }
    return { emailOrPhone: d.emailOrPhone.trim() };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const val = data.emailOrPhone;
    const isEmail = val.includes("@");

    // ابحث عن الحجوزات النشطة — استعلامات معاملات آمنة بدلاً من .or() لتفادي الحقن
    const query = supabaseAdmin
      .from("bookings")
      .select("id, client_name, client_email, client_phone, event_date, client_tracking_token, profiles(id, display_name)")
      .is("deleted_at", null)
      .in("status", ["pending_deposit", "confirmed"])
      .order("created_at", { ascending: false });

    const { data: bookings, error } = isEmail
      ? await query.eq("client_email", val)
      : await query.eq("client_phone", val);

    if (error) {
      console.error("[recover] error searching bookings:", error);
      throw new Error("حدث خطأ أثناء معالجة طلبك");
    }

    const successResponse = { 
      ok: true, 
      message: "إذا كانت بياناتك مسجلة لدينا وحجوزاتك نشطة، ستصلك رسالة بروابط التتبع قريباً." 
    };

    if (!bookings || bookings.length === 0) {
      // إرجاع نجاح وهمي لتجنب تسريب المعلومات (Email Enumeration Prevention)
      return successResponse;
    }

    const base = process.env.PUBLIC_APP_URL || "https://memoria-jo.lovable.app";
    let sentEmail = false;

    // تجميع الروابط
    const linksList = bookings.map((b: any) => {
      const pName = b.profiles?.display_name || "المصوّرة";
      return `- حجزك مع ${pName} بتاريخ ${b.event_date}:\n${base}/track/${b.client_tracking_token}`;
    }).join("\n\n");

    const emailHtml = `
      <div dir="rtl" style="font-family: sans-serif;">
        <h2>مرحباً ${bookings[0].client_name}،</h2>
        <p>طلبتم استرداد روابط التتبع لحجوزاتكم النشطة على منصة Memoria.</p>
        <p>إليكم روابط الحجوزات الخاصة بكم:</p>
        <pre style="background: #f4f4f5; padding: 16px; border-radius: 8px;">${linksList}</pre>
        <p>نتمنى لكم مناسبة سعيدة!</p>
      </div>
    `;

    // 1. أرسل بريداً إذا كان البريد متوفراً وطابق البحث
    const clientEmail = bookings[0].client_email;
    if (clientEmail && val.includes("@")) {
      try {
        const { sendEmail } = await import("@/lib/email.server");
        // لا ننتظر إرسال البريد (fire-and-forget جزئي لتثبيت وقت الاستجابة)
        sendEmail({
          to: clientEmail,
          subject: "روابط تتبع حجوزاتك — Memoria",
          html: emailHtml,
          template: "recover_tracking_links",
        }).catch(e => console.error("[recover] failed to send email", e));
        sentEmail = true;
      } catch (e) {
        console.error("[recover] failed to load email module", e);
      }
    }

    // 2. إذا لم يكن إيميلاً، أو فشل البريد وكان هناك رقم هاتف، نحاول الواتساب
    if (!sentEmail && bookings[0].client_phone && !val.includes("@")) {
      try {
        const { sendWhatsAppNotification } = await import("@/lib/whatsapp.server");
        const trackingUrl = `${base}/track/${bookings[0].client_tracking_token}`;
        sendWhatsAppNotification(
          bookings[0].profiles?.id || "",
          bookings[0].client_phone,
          "recover_links",
          {
            client_name: bookings[0].client_name,
            photographer_name: "Memoria Support",
            event_date: String(bookings[0].event_date),
            tracking_url: trackingUrl,
          }
        ).catch(e => console.error("[recover] failed to send whatsapp", e));
      } catch (e) {
        console.error("[recover] failed to load whatsapp module", e);
      }
    }

    return successResponse;
  });
