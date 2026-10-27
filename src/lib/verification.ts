import { t } from "@/i18n";
// What "verified" means on Memoria. One list, used by the photographer's
// dashboard (what's missing), the request endpoint (refuses incomplete
// requests) and the admin review (what was checked). The admin then confirms
// the parts a machine can't: that the work and the identity are genuinely hers.

export type VerificationInput = {
  avatar_url?: string | null;
  cover_url?: string | null;
  bio?: string | null;
  instagram?: string | null;
  portfolio_count: number;
  package_count: number;
  has_phone: boolean;
};

export type VerificationCheck = { key: string; label: string; ok: boolean };

export const MIN_PORTFOLIO = 6;

export function verificationChecks(i: VerificationInput): VerificationCheck[] {
  return [
    { key: "avatar", label: t("صورة شخصية واضحة"), ok: !!i.avatar_url },
    { key: "cover", label: t("صورة غلاف"), ok: !!i.cover_url },
    { key: "portfolio", label: t("{0} صور على الأقل من أعمالكِ", [MIN_PORTFOLIO]), ok: i.portfolio_count >= MIN_PORTFOLIO },
    { key: "packages", label: t("باقة أسعار واحدة على الأقل"), ok: i.package_count >= 1 },
    { key: "phone", label: t("رقم هاتف أو واتساب للتواصل"), ok: i.has_phone },
    { key: "instagram", label: t("حساب إنستغرام يعرض أعمالكِ"), ok: !!i.instagram?.trim() },
    { key: "bio", label: t("نبذة تعريفية (٤٠ حرفاً على الأقل)"), ok: (i.bio?.trim().length ?? 0) >= 40 },
  ];
}

export const missingChecks = (c: VerificationCheck[]) => c.filter((x) => !x.ok);
