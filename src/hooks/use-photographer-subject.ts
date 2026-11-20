import { useEffect, useState } from "react";
import { setSubjectGender } from "@/i18n";

/**
 * صفحات العروس: كل نص t() يتحدث عن المصوّر/ة بضمير الغائب يُكتب بجنسه تلقائياً.
 * يُضبط بعد الرسم الأول (useEffect) حتى لا يختلف عن نسخة الخادم، ثم يُعاد رسم الصفحة مرة واحدة.
 */
export function usePhotographerSubject(gender: string | null | undefined) {
  const [, bump] = useState(0);
  useEffect(() => {
    setSubjectGender(gender);
    if (gender === "male") bump((n) => n + 1);
    return () => setSubjectGender("female");
  }, [gender]);
}
