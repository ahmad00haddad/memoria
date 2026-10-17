import { useEffect, useState } from "react";

/**
 * يخفي العنصر الثابت عند التمرير لأسفل ويظهره عند التمرير لأعلى (نمط تطبيقات الهاتف)،
 * فيبقى المحتوى ظاهراً بدل أن تأكل الأشرطة الثابتة ثلث الشاشة.
 */
export function useHideOnScroll(threshold = 140) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (Math.abs(y - last) > 6) {
          setHidden(y > last && y > threshold);
          last = y;
        }
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return hidden;
}
