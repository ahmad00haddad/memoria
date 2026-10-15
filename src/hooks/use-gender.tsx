import { Fragment, createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

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
} catch {}
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const saved: Gender = session?.user.user_metadata?.gender === "male" ? "male" : "female";
      try { localStorage.setItem(LS_KEY, saved); } catch {}
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
    try { localStorage.setItem(LS_KEY, next); } catch {}
    await supabase.auth.updateUser({ data: { gender: next } });
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
