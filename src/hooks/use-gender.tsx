import { Fragment, createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setAddresseeGender } from "@/i18n";

// صيغة مخاطبة المصوّر/ة في لوحة التحكم. المنصّة موجّهة للمصوّرات، فالافتراضي مؤنّث،
// ويُحفظ اختيار «مصوّر» في user_metadata.gender للحساب نفسه (لا يحتاج عموداً في القاعدة).
export type Gender = "female" | "male";

type Ctx = {
  gender: Gender;
  setGender: (g: Gender) => Promise<void>;
  /** يعيد النص المؤنّث أو المذكّر حسب صاحب الحساب. */
  g: (female: string, male: string) => string;
};

// نسخة عامة تُقرأ أثناء الرسم من أي مكان (حتى خارج المكوّنات أثناء التنفيذ).
// تُخزَّن محلياً أيضاً كي تكون صحيحة من أول رسم في الزيارات التالية.
const LS_KEY = "memoria.gender";
let current: Gender = "female";
try {
  if (typeof window !== "undefined" && localStorage.getItem(LS_KEY) === "male") current = "male";
} catch { /* ignore */ }
export function g(female: string, male: string) {
  return current === "male" ? male : female;
}

const GenderContext = createContext<Ctx>({
  gender: "female",
  setGender: async () => {},
  g: (f) => f,
});

export function GenderProvider({ children }: { children: ReactNode }) {
  const [gender, setG] = useState<Gender>(current);
  // يتغيّر فقط إذا اختلفت القيمة المحفوظة في الحساب عن المخزّنة محلياً، فيُعاد رسم الشجرة مرة واحدة.
  const [epoch, setEpoch] = useState(0);
  // كل نصوص t() داخل اللوحة تُخاطب صاحب الحساب بجنسه (تحويل تلقائي من gender-text)
  setAddresseeGender(gender);
  useEffect(() => () => setAddresseeGender("female"), []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      // المصدر: user_metadata.gender، وإن غاب فـ profiles.gender (نفس ما تراه العروس)
      let meta = session?.user.user_metadata?.gender as string | undefined;
      if (!meta && session) {
        const { data: p } = await (supabase as any).from("profiles").select("gender").eq("id", session.user.id).maybeSingle();
        meta = p?.gender ?? undefined;
      }
      const saved: Gender = meta === "male" ? "male" : "female";
      try { localStorage.setItem(LS_KEY, saved); } catch { /* ignore */ }
      if (saved !== current) {
        current = saved;
        setG(saved);
        setEpoch((e) => e + 1);
      }
    });
  }, []);

  // المكوّنات التي تعرض المنتقي تستدعي useGender() فتُعاد رسمها دون فقدان حالة النماذج.
  const setGender = useCallback(async (next: Gender) => {
    current = next;
    setG(next);
    try { localStorage.setItem(LS_KEY, next); } catch { /* ignore */ }
    await supabase.auth.updateUser({ data: { gender: next } });
    // نسخة عامة في الملف حتى تُكتب صفحتها للعروس بالصيغة الصحيحة (مصوّر / مصوّرة)
    const { data: { session } } = await supabase.auth.getSession();
    if (session) await (supabase as any).from("profiles").update({ gender: next }).eq("id", session.user.id);
  }, []);

  const gfn = useCallback((f: string, m: string) => (gender === "male" ? m : f), [gender]);

  return (
    <GenderContext.Provider value={{ gender, setGender, g: gfn }}>
      <Fragment key={epoch}>{children}</Fragment>
    </GenderContext.Provider>
  );
}

export function useGender() {
  return useContext(GenderContext);
}
