import { useEffect } from "react";

/**
 * Client-only Lenis smooth scroll initializer.
 * Mount once near the app root. SSR-safe: all browser code lives inside useEffect.
 * Respects prefers-reduced-motion by skipping initialization entirely.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (mq?.matches) return;

    let raf = 0;
    let lenis: { raf: (t: number) => void; destroy: () => void } | null = null;
    let cancelled = false;

    import("lenis")
      .then(({ default: Lenis }) => {
        if (cancelled) return;
        lenis = new Lenis({
          duration: 1.05,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          smoothWheel: true,
          touchMultiplier: 1.4,
        });
        const loop = (time: number) => {
          lenis?.raf(time);
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      lenis?.destroy();
    };
  }, []);

  return null;
}