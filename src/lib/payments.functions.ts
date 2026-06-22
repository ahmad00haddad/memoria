import { createServerFn } from "@tanstack/react-start";

// ============================================================================
// payments.functions.ts — دوال الدفع المُعرَّضة للعميل (server-fns)
// ----------------------------------------------------------------------------
// createDepositCheckout: ينشئ جلسة دفع للعربون ويعيد رابط Checkout.
//
// قرار تصميمي (server-authoritative):
//   العميل على صفحة /track/$token لا يملك سوى رمز التتبّع، لذا ندخل بالرمز لا
//   بـ booking_id قادم من العميل. نحلّ الحجز ونعيد حساب مبلغ العربون من قاعدة
//   البيانات على الخادم — لا نثق بأي مبلغ/حالة من المتصفح (القاعدة الذهبية #1).
//
//   env-gated: إن لم تُضبط مفاتيح البوّابة نُعيد { configured: false } دون رمي
//   خطأ، فيُبقي العميل على مسار CliQ اليدوي (no-op آمن).
// ============================================================================

const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;

function appBase(): string {
  return process.env.PUBLIC_APP_URL || "https://royal-lens-flow.lovable.app";
}

export const createDepositCheckout = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => {
    if (!d || typeof d.token !== "string" || !TOKEN_RE.test(d.token)) {
      throw new Error("invalid token");
    }
    return d;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getPaymentProvider, isPaymentConfigured, activeProviderName } =
      await import("@/lib/payments.server");

    // 1) حلّ الحجز من رمز التتبّع (service-role — server-authoritative).
    const { data: bk, error } = await supabaseAdmin
      .from("bookings")
      .select("id, status, deposit_amount, deposit_confirmed_at, client_email, client_tracking_token, deleted_at")
      .eq("client_tracking_token", data.token)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!bk) throw new Error("الحجز غير موجود");

    if (bk.deposit_confirmed_at || bk.status === "confirmed") {
      throw new Error("تم تأكيد العربون لهذا الحجز مسبقاً");
    }
    if (bk.status !== "pending_deposit" && bk.status !== "quote") {
      throw new Error("لا يمكن دفع العربون في حالة الحجز الحالية");
    }

    // 2) المبلغ يُؤخذ من قاعدة البيانات حصراً (لا من العميل).
    const amount = Number(bk.deposit_amount ?? 0);
    if (!(amount > 0)) {
      throw new Error("لا يوجد مبلغ عربون مطلوب لهذا الحجز");
    }

    // 3) بوّابة مهيّأة؟ إن لا → no-op آمن (يبقى مسار CliQ اليدوي).
    if (!isPaymentConfigured()) {
      return { configured: false as const, provider: activeProviderName() };
    }
    const provider = getPaymentProvider();
    if (!provider) {
      return { configured: false as const, provider: activeProviderName() };
    }

    const currency = (process.env.PAYMENT_CURRENCY || "JOD").toUpperCase();
    const trackUrl = `${appBase()}/track/${bk.client_tracking_token}`;

    // 4) إنشاء جلسة الدفع.
    const checkout = await provider.createDepositCheckout({
      booking_id: bk.id,
      amount,
      currency,
      description: "عربون تثبيت الحجز",
      success_url: `${trackUrl}?payment=success`,
      cancel_url: `${trackUrl}?payment=cancelled`,
      client_email: bk.client_email,
    });

    // 5) خزّن معرّف الجلسة للربط مع الـ webhook لاحقاً (لا يؤكّد الحجز هنا —
    //    التأكيد يحدث فقط عند وصول حدث دفع موثّق التوقيع إلى webhook).
    await supabaseAdmin
      .from("bookings")
      .update({
        deposit_payment_provider: checkout.provider,
        deposit_checkout_session_id: checkout.session_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bk.id);

    return {
      configured: true as const,
      url: checkout.url,
      provider: checkout.provider,
    };
  });
