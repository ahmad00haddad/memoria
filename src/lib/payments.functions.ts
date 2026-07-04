import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ----- Public capability check (لمعرفة ما إذا كانت بوّابة الدفع مفعّلة) -----
export const isPaymentsEnabled = createServerFn({ method: "GET" }).handler(async () => {
  const { isPaymentConfigured, activeProviderName } = await import("@/lib/payments.server");
  return { enabled: isPaymentConfigured(), provider: activeProviderName() };
});

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
  return process.env.PUBLIC_APP_URL || "https://memoria-jo.lovable.app";
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

// ============================================================================
// createSubscriptionCheckout — دفع الاشتراك أونلاين (server-authoritative)
// ----------------------------------------------------------------------------
// المصوّرة المسجّلة تطلب تجديد الاشتراك عبر بوّابة الدفع.
// يُنشئ Checkout Session بـ metadata[kind=subscription] لكي يُعالجها الـ webhook.
// ============================================================================
export const createSubscriptionCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { months: number }) => {
    if (!d || !Number.isInteger(d.months) || d.months < 1 || d.months > 12) {
      throw new Error("months يجب أن يكون بين 1 و12");
    }
    return d;
  })
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getPaymentProvider, isPaymentConfigured, activeProviderName } =
      await import("@/lib/payments.server");

    // التحقق من وجود الملف الشخصي
    const { data: profile, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, username")
      .eq("id", userId)
      .maybeSingle();
    if (profErr) throw new Error(profErr.message);
    if (!profile) throw new Error("الملف الشخصي غير موجود");

    // بوّابة الدفع مهيّأة؟
    if (!isPaymentConfigured()) {
      return { configured: false as const, provider: activeProviderName() };
    }
    const provider = getPaymentProvider();
    if (!provider) {
      return { configured: false as const, provider: activeProviderName() };
    }

    // سعر الاشتراك من env (الافتراضي: 25 دينار/شهر)
    const monthlyPrice = Number(process.env.SUBSCRIPTION_MONTHLY_PRICE || "25");
    const amount = monthlyPrice * data.months;
    const currency = (process.env.PAYMENT_CURRENCY || "JOD").toUpperCase();
    const base = process.env.PUBLIC_APP_URL || "https://memoria-jo.lovable.app";

    const checkout = await provider.createDepositCheckout({
      // نُعيد استخدام createDepositCheckout مع metadata مختلفة
      booking_id: `sub_${userId}_${Date.now()}`, // placeholder — الـ webhook يقرأ من metadata
      amount,
      currency,
      description: `اشتراك Memoria — ${data.months} ${data.months === 1 ? "شهر" : "أشهر"}`,
      success_url: `${base}/dashboard/subscription?payment=success`,
      cancel_url: `${base}/dashboard/subscription?payment=cancelled`,
    });

    // تخزين معلومات الجلسة — تُحدَّث بعد وصول webhook
    await supabaseAdmin
      .from("subscription_payments")
      .insert({
        photographer_id: userId,
        provider: checkout.provider,
        session_id: checkout.session_id,
        amount,
        currency,
        months: data.months,
        status: "pending",
      } as any)
      ;

    return {
      configured: true as const,
      url: checkout.url,
      provider: checkout.provider,
      months: data.months,
      amount,
    };
  });

// ============================================================================
// processRefund — معالجة استرداد العربون (أدمن فقط)
// ============================================================================
export const processDepositRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { booking_id: string; amount?: number | null }) => {
    const UUID_RE = /^[0-9a-f-]{36}$/i;
    if (!d || typeof d.booking_id !== "string" || !UUID_RE.test(d.booking_id)) {
      throw new Error("invalid booking_id");
    }
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    // التحقق من أن المستخدم أدمن
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) throw new Error("forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // جلب بيانات الحجز
    const { data: bk, error: fetchErr } = await supabaseAdmin
      .from("bookings")
      .select("id, refund_amount, refund_status, deposit_payment_provider, deposit_checkout_session_id, client_email, client_name, photographer_id, event_date")
      .eq("id", data.booking_id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!bk) throw new Error("الحجز غير موجود");
    if (bk.refund_status === "refunded") throw new Error("تم معالجة الاسترداد مسبقاً");
    if (bk.refund_status !== "pending") throw new Error("هذا الحجز لا يحتاج استرداداً");

    const refundAmount = data.amount ?? Number(bk.refund_amount ?? 0);
    let providerRefundId: string | null = null;

    // محاولة الاسترداد عبر بوّابة الدفع إن كانت مهيّأة
    const { getPaymentProvider } = await import("@/lib/payments.server");
    const provider = getPaymentProvider();

    if (provider && bk.deposit_checkout_session_id) {
      try {
        // Stripe refund API
        const currency = (process.env.PAYMENT_CURRENCY || "JOD").toUpperCase();
        const { toMinorUnit } = await import("@/lib/payments.server");
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (stripeKey && bk.deposit_payment_provider === "stripe") {
          // جلب payment_intent من الجلسة
          const sessRes = await fetch(
            `https://api.stripe.com/v1/checkout/sessions/${bk.deposit_checkout_session_id}`,
            { headers: { Authorization: `Bearer ${stripeKey}` } }
          );
          const sessJson: any = await sessRes.json().catch(() => ({}));
          const intentId = sessJson?.payment_intent;
          if (intentId) {
            const rfRes = await fetch("https://api.stripe.com/v1/refunds", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${stripeKey}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                payment_intent: intentId,
                amount: String(toMinorUnit(refundAmount, currency)),
              }).toString(),
            });
            const rfJson: any = await rfRes.json().catch(() => ({}));
            if (rfRes.ok) {
              providerRefundId = rfJson.id;
            } else {
              throw new Error(rfJson?.error?.message || `Stripe refund failed (${rfRes.status})`);
            }
          }
        }
      } catch (e: any) {
        throw new Error(`فشل الاسترداد عبر بوّابة الدفع: ${e.message}`);
      }
    }

    // تحديث حالة الاسترداد في قاعدة البيانات
    const now = new Date().toISOString();
    await supabaseAdmin
      .from("bookings")
      .update({
        refund_status: "refunded",
        updated_at: now,
      } as any)
      .eq("id", data.booking_id);

    // تسجيل في audit_logs
    await supabaseAdmin.from("audit_logs").insert({
      action: "booking.refund.processed",
      actor_id: userId,
      entity_type: "booking",
      entity_id: data.booking_id,
      after_data: {
        refund_status: "refunded",
        refund_amount: refundAmount,
        provider_refund_id: providerRefundId,
      } as any,
    });

    // إيميل للعميل (fire-and-forget)
    try {
      const { sendEmail } = await import("@/lib/email.server");
      if (bk.client_email) {
        const { data: prof } = await supabaseAdmin
          .from("profiles").select("display_name").eq("id", bk.photographer_id).maybeSingle();
        await sendEmail({
          to: bk.client_email,
          subject: "تم استرداد العربون ✓",
          html: `<p>مرحباً ${bk.client_name || ""},</p>
<p>تم معالجة استرداد العربون بمبلغ <strong>${refundAmount}</strong> للحجز بتاريخ ${bk.event_date}.</p>
<p>سيصلك المبلغ خلال 5-10 أيام عمل حسب طريقة الدفع المستخدمة.</p>`,
          template: "deposit_refunded",
          related_booking_id: data.booking_id,
        });
      }
    } catch (e) { console.error("[refund] email failed", e); }

    return {
      ok: true,
      refund_amount: refundAmount,
      provider_refund_id: providerRefundId,
    };
  });
