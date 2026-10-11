import { useEffect, useRef, useState } from "react";
import { useIntro } from "@/lib/intro";

/**
 * Animates a numeric value toward `target` over `duration` ms using rAF.
 * The first run counts up from 0; later changes count from the previous value,
 * so a refresh nudges the number instead of replaying the whole count.
 * Safe on SSR (no animation runs server-side).
 * Respects prefers-reduced-motion by snapping to the final value.
 */
export function useCountUp(target: number, duration = 1100): number {
  // Return visits skip the intro: the first value lands without counting.
  const intro = useIntro();
  const [value, setValue] = useState(intro ? 0 : target);
  const lastRef = useRef(intro ? 0 : target);

  useEffect(() => {
    if (typeof window === "undefined" || Number.isNaN(target)) {
      setValue(target);
      lastRef.current = target;
      return;
    }
    const reduce = !intro && lastRef.current === 0 ? true : window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const from = lastRef.current;
    if (reduce || from === target) {
      setValue(target);
      lastRef.current = target;
      return;
    }

    const startTime = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const v = from + (target - from) * eased;
      setValue(v);
      lastRef.current = v;
      if (t < 1) raf = requestAnimationFrame(tick);
      else { setValue(target); lastRef.current = target; }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
