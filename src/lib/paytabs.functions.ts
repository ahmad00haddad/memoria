import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ============================================================================
// paytabs.functions.ts — بدء دفع الاشتراك عبر PayTabs (يدوي، كل فترة)
// ----------------------------------------------------------------------------
// السعر والمدة من الخادم فقط. ننشئ صف subscription_payments (method=gateway,
// status=pending) ونستخدم id الصف كـ cart_id لدى PayTabs، ثم نعيد رابط الصفحة.
// إن لم تُضبط مفاتيح PayTabs نعيد configured=false ويبقى مسار زبوني اليدوي.
// ============================================================================

const PLANS = {
  monthly: { months: 1, jod: 7, name: "Flex" },
  yearly: { months: 12, jod: 70, name: "Signature" },
} as const;
type PlanKey = keyof typeof PLANS;

export const getPayTabsStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { isPayTabsConfigured } = await import("@/lib/paytabs.server");
  return { enabled: isPayTabsConfigured() };
});

export const startPayTabsSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { plan: PlanKey }) => {
    if (!d || !(d.plan in PLANS)) throw new Error("invalid plan");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    const { isPayTabsConfigured, createHostedPayment } = await import("@/lib/paytabs.server");
    if (!isPayTabsConfigured()) return { configured: false as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const plan = PLANS[data.plan];

    const [{ data: prof }, { data: u }] = await Promise.all([
      supabaseAdmin.from("profiles").select("display_name, username").eq("id", userId).maybeSingle(),
      supabaseAdmin.auth.admin.getUserById(userId),
    ]);
    const email = u?.user?.email;
    if (!email) throw new Error("لا يوجد بريد إلكتروني على الحساب");

    const { data: row, error } = await (supabaseAdmin as any)
      .from("subscription_payments")
      .insert({
        photographer_id: userId,
        amount: plan.jod,
        currency: "JOD",
        period_months: plan.months,
        method: "gateway",
        status: "pending",
        notes: `PayTabs · ${plan.name}`,
      })
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message || "تعذّر إنشاء الدفعة");

    const base = process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
    try {
      const { redirectUrl } = await createHostedPayment({
        cartId: row.id,
        amount: plan.jod,
        currency: "JOD",
        description: `Memoria ${plan.name} — ${plan.months === 12 ? "اشتراك سنوي" : "اشتراك شهري"}`,
        callbackUrl: `${base}/api/public/hooks/paytabs`,
        returnUrl: `${base}/api/public/hooks/paytabs`,
        customer: { name: (prof as any)?.display_name || (prof as any)?.username || "Memoria", email },
      });
      return { configured: true as const, url: redirectUrl };
    } catch (e: any) {
      await (supabaseAdmin as any)
        .from("subscription_payments")
        .update({ status: "rejected", notes: `PayTabs: ${e?.message || "request failed"}` })
        .eq("id", row.id);
      throw new Error("تعذّر فتح صفحة الدفع، حاولي مجدداً");
    }
  });
