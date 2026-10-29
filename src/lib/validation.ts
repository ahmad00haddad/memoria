// Shared input checks for forms people fill in without guidance (booking, deposit, sign-up).

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Arabic-Indic digits → Latin, and drop spaces, dashes, brackets and dots. */
export function cleanDigits(raw: string): string {
  return (raw ?? "")
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/[\s\-().]/g, "");
}

/**
 * A phone number → a clean form, or null.
 * Jordanian mobiles in any spelling (0791234567, +962…, 00962…, Arabic digits) → "0791234567".
 * Any other country needs its code (+966…, 00971…) → "+966501234567".
 */
export function normalizePhone(raw: string): string | null {
  let p = cleanDigits(raw);
  const intl = p.startsWith("+") || p.startsWith("00");
  p = p.replace(/^\+/, "").replace(/^00/, "");
  if (!/^\d+$/.test(p)) return null;
  const jo = p.startsWith("962") ? p.slice(3) : intl ? null : p.replace(/^0/, "");
  if (jo && /^7[789]\d{7}$/.test(jo)) return "0" + jo;
  if (intl && !p.startsWith("962") && /^[1-9]\d{7,14}$/.test(p)) return "+" + p;
  return null;
}

export const PHONE_HINT =
  "رقم الجوال غير صحيح. مثال: 0791234567، أو مع رمز الدولة لغير الأردن: ‎+966501234567";

export function isEmail(raw: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test((raw ?? "").trim());
}

export const EMAIL_HINT = "البريد الإلكتروني غير صحيح. مثال: name@gmail.com";

// مدّة الجلسة بالدقائق. نهاية قبل البداية = تنتهي بعد منتصف الليل (عرس 20:00–02:00).
// نهاية = بداية تُعاد 0 (غير صالحة).
export function sessionMinutes(start: string, end: string): number {
  const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return (h || 0) * 60 + (m || 0); };
  const d = toMin(end) - toMin(start);
  return d < 0 ? d + 1440 : d;
}

// تاريخ اليوم التالي (YYYY-MM-DD) لنهاية جلسة تقطع منتصف الليل
export function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
