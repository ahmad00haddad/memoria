// ============================================================================
// plans.ts — أسعار وحدود باقات الاشتراك (مصدر واحد للخادم والواجهة)
// ----------------------------------------------------------------------------
// Basic: 15 شهري / 180 سنوي. Pro: 20 شهري / 200 سنوي (السنوي أوفر 40 د.أ).
// المشتركات قبل الأسعار الجديدة (legacy_price_until) يحصلن على Pro بالسعر
// القديم 7 / 70 حتى نهاية السنة. التجربة المجانية = Pro كاملة.
// الحدود نفسها مفروضة في قاعدة البيانات (enforce_basic_*).
// ============================================================================

export type Tier = "basic" | "pro";
export type Period = "monthly" | "yearly";

export const TIERS: Tier[] = ["basic", "pro"];
export const PERIOD_MONTHS: Record<Period, number> = { monthly: 1, yearly: 12 };

export const PRICES: Record<Tier, Record<Period, number>> = {
  basic: { monthly: 15, yearly: 180 },
  pro: { monthly: 20, yearly: 200 },
};

// سعر المؤسِّسات: Pro بالسعر القديم لسنة
export const LEGACY_PRICES: Record<Period, number> = { monthly: 7, yearly: 70 };

export const TIER_NAME: Record<Tier, string> = { basic: "Basic", pro: "Pro" };

export const BASIC_LIMITS = { packages: 3, photos: 20 };
export const PRO_PHOTOS = 60;

export function isLegacy(legacyUntil: string | null | undefined): boolean {
  return !!legacyUntil && new Date(legacyUntil).getTime() > Date.now();
}

/** السعر الفعلي لهذه المصوّرة. السعر القديم لـPro فقط. */
export function priceFor(tier: Tier, period: Period, legacyUntil?: string | null): number {
  if (tier === "pro" && isLegacy(legacyUntil)) return LEGACY_PRICES[period];
  return PRICES[tier][period];
}

export function isPlanInput(d: any): d is { tier: Tier; period: Period } {
  return !!d && (d.tier === "basic" || d.tier === "pro") && (d.period === "monthly" || d.period === "yearly");
}
