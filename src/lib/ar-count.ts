import { getLang } from "@/i18n";

/**
 * تمييز العدد بالعربية: «يوم / يومين / 3 أيام / 12 يوماً».
 * one: المفرد (1)، two: المثنى (2)، few: الجمع (3–10)، many: المفرد المنصوب (11+).
 */
export function arCount(n: number, one: string, two: string, few: string, many: string): string {
  const abs = Math.abs(n);
  // English (forms arrive already translated by t()): "1 day" / "3 days"
  if (getLang() === "en") return `${n} ${abs === 1 ? one : few}`;
  if (abs === 1) return one;
  if (abs === 2) return two;
  const mod100 = abs % 100;
  if (mod100 >= 3 && mod100 <= 10) return `${n} ${few}`;
  if (abs === 0) return `0 ${few}`;
  // 100، 200، 1000…: تمييز مفرد مجرور («100 يوم»)
  if (mod100 === 0) return `${n} ${one.split(" ")[0]}`;
  return `${n} ${many}`;
}
