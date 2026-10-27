import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { t } from "@/i18n";

// ============================================================================
// zbooni.functions.ts — دفع الاشتراكات عبر زبوني (المرحلة الأولى)
// ----------------------------------------------------------------------------
// لا يوجد API بعد: المصوّرة تفتح رابط منتج الباقة على زبوني وتدفع هناك.
//   1) startZbooniSubscription: ينشئ (أو يعيد استخدام) دفعة معلّقة method=zbooni
//      برمز مرجعي MEM-XXXXXX، ويعيد رابط الدفع للباقة.
//   2) confirmZbooniSubscriptionPaid: المصوّرة تؤكّد أنها دفعت → تنبيه الأدمن،
//      والأدمن يطابق الدفعة في لوحة زبوني (بالإيميل/المرجع) ويعتمدها.
// الأسعار والروابط على الخادم فقط (server-authoritative).
// روابط الباقات من env: ZBOONI_FLEX_URL / ZBOONI_SIGNATURE_URL، وإن غابت نستخدم
// صفحات المنتجين على متجر cShop (ZBOONI_STORE_URL).
// ============================================================================

import { isPlanInput, type Period, type Tier } from "@/lib/plans";

// منتج زبوني سعره ثابت، فكل سعر يحتاج منتجاً خاصاً به. المنتجان القديمان
// (7 / 70) لسعر المؤسِّسات فقط؛ الأسعار الجديدة من env:
// ZBOONI_BASIC_MONTHLY_URL · ZBOONI_BASIC_YEARLY_URL · ZBOONI_PRO_MONTHLY_URL · ZBOONI_PRO_YEARLY_URL
function planUrl(tier: Tier, period: Period, legacy: boolean): string | null {
  const store = process.env.ZBOONI_STORE_URL || "https://ahmad-haddad.zbooni.com";
  if (legacy) {
    return period === "yearly"
      ? process.env.ZBOONI_SIGNATURE_URL || `${store}/products/shtrk-snwy-12-months`
      : process.env.ZBOONI_FLEX_URL || `${store}/products/shtrk-shhry-1840056`;
  }
  return process.env[`ZBOONI_${tier.toUpperCase()}_${period.toUpperCase()}_URL`] || null;
}

function newReference(): string {
  // بدون حروف ملتبسة (0/O, 1/I)
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return "MEM-" + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export const startZbooniSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tier: Tier; period: Period }) => {
    if (!isPlanInput(d)) throw new Error("invalid plan");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { resolvePlan } = await import("@/lib/plans.server");
    const plan = await resolvePlan(userId, data.tier, data.period);
    const url = planUrl(plan.tier, plan.period, plan.legacy);
    if (!url) throw new Error(t("الدفع عبر زبوني غير متاح لهذه الباقة حالياً — ادفعي بالبطاقة"));

    // إعادة استخدام دفعة مفتوحة لنفس الباقة (آخر 24 ساعة) بدل تكديس صفوف.
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: existing } = await (supabaseAdmin as any)
      .from("subscription_payments")
      .select("id, payment_reference")
      .eq("photographer_id", userId)
      .eq("method", "zbooni")
      .eq("status", "pending")
      .eq("period_months", plan.months)
      .eq("tier", plan.tier)
      .is("payer_confirmed_at", null)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let reference: string | null = existing?.payment_reference ?? null;
    let paymentId: string | null = existing?.id ?? null;

    if (!paymentId) {
      for (let attempt = 0; attempt < 3 && !paymentId; attempt++) {
        reference = newReference();
        const { data: row, error } = await (supabaseAdmin as any)
          .from("subscription_payments")
          .insert({
            photographer_id: userId,
            amount: plan.jod,
            currency: "JOD",
            period_months: plan.months,
            tier: plan.tier,
            method: "zbooni",
            status: "pending",
            payment_reference: reference,
            notes: `Zbooni · ${plan.name}`,
          })
          .select("id")
          .single();
        if (error && (error as any).code !== "23505") throw new Error(error.message);
        paymentId = row?.id ?? null;
      }
      if (!paymentId) throw new Error(t("تعذّر إنشاء الدفعة، حاولي مجدداً"));
    }

    const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId);
    return {
      payment_id: paymentId,
      reference,
      url,
      email: u?.user?.email ?? null,
      amount: plan.jod,
      months: plan.months,
      name: plan.name,
    };
  });

export const confirmZbooniSubscriptionPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { payment_id: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(d?.payment_id ?? "")) throw new Error("invalid payment_id");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await (supabaseAdmin as any)
      .from("subscription_payments")
      .update({ payer_confirmed_at: new Date().toISOString() })
      .eq("id", data.payment_id)
      .eq("photographer_id", userId)
      .eq("method", "zbooni")
      .eq("status", "pending")
      .select("id, amount, period_months, payment_reference, tier")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error(t("الدفعة غير موجودة أو تمت معالجتها"));

    // تنبيه الأدمن (داخلي + إيميل) — لا يمنع المصوّرة عند الفشل.
    try {
      const [{ data: prof }, { data: admins }] = await Promise.all([
        supabaseAdmin.from("profiles").select("display_name, username").eq("id", userId).maybeSingle(),
        supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin"),
      ]);
      const name = (prof as any)?.display_name || (prof as any)?.username || t("مصوّرة");
      const plan = `${row.tier === "basic" ? "Basic" : "Pro"} · ${row.period_months === 12 ? t("سنوي") : t("شهري")}`;
      const title = t("💳 دفعة زبوني بانتظار المطابقة");
      const body = t("{0} أكّدت دفع {1} د.أ ({2}) عبر زبوني — المرجع {3}.", [name, row.amount, plan, row.payment_reference]);
      if (admins?.length) {
        await supabaseAdmin.from("notifications").insert(
          admins.map((a: any) => ({ user_id: a.user_id, type: "system", title, body, link: "/admin/subscriptions" })),
        );
        const { sendEmail } = await import("@/lib/email.server");
        const base = process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
        for (const a of admins as any[]) {
          const { data: u } = await supabaseAdmin.auth.admin.getUserById(a.user_id);
          const to = u?.user?.email;
          if (!to) continue;
          await sendEmail({
            to,
            subject: title,
            template: "admin_subscription_payment",
            related_user_id: userId,
            html: t("<div dir=\"rtl\" style=\"font-family:Tahoma,Arial,sans-serif;line-height:1.8\"> <h2 style=\"margin:0 0 8px\">{0}</h2> <p>{1}</p> <p>طابِق الدفعة في لوحة زبوني ثم اعتمدها: <a href=\"{2}/admin/subscriptions\">{3}/admin/subscriptions</a></p> </div>", [title, body.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!), base, base]),
          }).catch(() => {});
        }
      }
    } catch (e) {
      console.error("[zbooni] admin notify failed:", e);
    }

    return { ok: true };
  });
