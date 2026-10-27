import { PERIOD_MONTHS, TIER_NAME, isLegacy, priceFor, type Period, type Tier } from "@/lib/plans";

/** السعر والمدة لهذه المصوّرة من الخادم فقط (يشمل سعر المؤسِّسات). */
export async function resolvePlan(userId: string, tier: Tier, period: Period) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: sub } = await (supabaseAdmin as any)
    .from("subscriptions").select("legacy_price_until").eq("photographer_id", userId).maybeSingle();
  const legacyUntil = sub?.legacy_price_until ?? null;
  return {
    tier,
    period,
    months: PERIOD_MONTHS[period],
    jod: priceFor(tier, period, legacyUntil),
    legacy: tier === "pro" && isLegacy(legacyUntil),
    name: `${TIER_NAME[tier]} · ${period === "yearly" ? "سنوي" : "شهري"}`,
  };
}
