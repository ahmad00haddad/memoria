// تدقيق صيغة المخاطبة: يمرّر كل نصوص صفحات العروس ورسائلها عبر thirdToMale،
// وكل نصوص لوحة المصوّر عبر secondToMale، ويفشل إن بقيت صيغة مؤنّثة معروفة بعد التحويل.
// إن فشل: أضيفي الكلمة الجديدة إلى قاموس src/lib/gender-text.ts (مرة واحدة تكفي لكل النصوص).
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { secondToMale, thirdToMale } from "../gender-text";

const ROOT = join(__dirname, "..", "..");
const STR = /\b(?:t|tr|tx)\(\s*"((?:[^"\\]|\\.)*)"/g;
const TPL = /`((?:[^`\\]|\\.)*)`/g;

function files(dir: string, out: string[] = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) files(p, out);
    else if (/\.(ts|tsx)$/.test(f) && !/\.test\./.test(f)) out.push(p);
  }
  return out;
}
const read = (p: string) => readFileSync(p, "utf8");
const literals = (src: string, withTemplates = false) => {
  const out: string[] = [];
  for (const m of src.matchAll(STR)) out.push(m[1]);
  if (withTemplates) for (const m of src.matchAll(TPL)) if (/[؀-ۿ]/.test(m[1])) out.push(m[1]);
  return out;
};

// صفحات وقوالب موجّهة للعروس تتحدث عن مصوّر/ة بعينه
const BRIDE_FILES = [
  "routes/track.$token.tsx", "routes/photographers/$username.tsx", "routes/offer.$token.tsx", "routes/ask.$token.tsx",
  "routes/contracts.$token.tsx", "routes/review.$token.tsx", "components/PaymentMethods.tsx", "components/StepUpBox.tsx",
  "components/Term.tsx", "components/VerifyBookingPanel.tsx", "components/BookingJourney.tsx", "components/VerifiedBadge.tsx",
  "components/AskPhotographer.tsx",
].map((f) => join(ROOT, f));

// كلمات تدل على أن المصوّر/ة ما زال بصيغة المؤنّث بعد التحويل
const LEFT_THIRD = /(?<![؀-ۿ])(?:[وفلب])?(?:المصوّرة|المصورة|وافقت|ردّت|أكّدت|أرسلت|اعتذرت|ألغت|موافقتها|ردّها|رقمها|حسابها|لحسابها|معها|راسليها|اسأليها|تابعيها|أعمالها|صفحتها|باقتها|باقاتها|سياستها)(?![؀-ۿ])/;

describe("صفحات العروس: الحديث عن مصوّر رجل", () => {
  for (const f of BRIDE_FILES) {
    it(f.split(/[\\/]src[\\/]/)[1] ?? f, () => {
      const left = literals(read(f)).map(thirdToMale).filter((s) => LEFT_THIRD.test(s));
      expect(left).toEqual([]);
    });
  }
});

// كلمات مخاطبة مؤنّثة تبقى بعد التحويل في لوحة المصوّر
const LEFT_SECOND = /(?<![؀-ۿ])(?:[وف])?(?:[^\s]*كِ|[^\s]*تِ|أنتِ|اضغطي|اختاري|افتحي|أضيفي|اكتبي|راجعي|ارفعي|سجّلي|أرسلي|تأكّدي|تواصلي|ألغي|انسخي|شاركي|احفظي|حدّثي|أكملي|جرّبي|ضعي|تابعي)(?![؀-ۿ])/;
const DASH_DIRS = ["routes/_authenticated", "components/dashboard"].map((d) => join(ROOT, d));

describe("لوحة المصوّر: مخاطبة مصوّر رجل", () => {
  for (const dir of DASH_DIRS) {
    it(dir.split(/[\\/]src[\\/]/)[1] ?? dir, () => {
      const left: string[] = [];
      for (const f of files(dir)) {
        for (const s of literals(read(f))) {
          if (s.startsWith("مرحباً {0}")) continue; // رسائل جاهزة للعروس
          const m = secondToMale(s);
          if (LEFT_SECOND.test(m)) left.push(`${f.split(/[\\/]src[\\/]/)[1]}: ${m}`);
        }
      }
      expect(left).toEqual([]);
    });
  }
});
