// تلميحات صغيرة للنماذج: تصحيح نطاق البريد وقوة كلمة المرور.

const COMMON_DOMAINS = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "icloud.com", "live.com"];

function distance(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

/** يعيد البريد المصحّح إذا كان النطاق قريباً من نطاق شائع (gmial.com → gmail.com)، وإلا null. */
export function emailTypoSuggestion(email: string): string | null {
  const m = email.trim().toLowerCase().match(/^([^@\s]+)@([^@\s]+\.[a-z]{2,})$/);
  if (!m) return null;
  const [, user, domain] = m;
  if (COMMON_DOMAINS.includes(domain)) return null;
  const best = COMMON_DOMAINS.map((d) => ({ d, n: distance(domain, d) })).sort((x, y) => x.n - y.n)[0];
  return best.n > 0 && best.n <= 2 ? `${user}@${best.d}` : null;
}

/** قوة كلمة المرور من ٠ إلى ٣ مع نصيحة قصيرة بالعربية. */
export function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3; hint: string } {
  if (!pw) return { score: 0, hint: "" };
  if (pw.length < 8) return { score: 1, hint: `${8 - pw.length} أحرف إضافية على الأقل` };
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  if (variety >= 3 && pw.length >= 10) return { score: 3, hint: "كلمة مرور قوية" };
  if (variety >= 2) return { score: 2, hint: "جيدة — أضيفي رمزاً أو حرفاً كبيراً لتصبح أقوى" };
  return { score: 1, hint: "أضيفي أرقاماً أو رموزاً" };
}
