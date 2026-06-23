import { useEffect, useRef } from "react";

/**
 * Client-only GSAP ScrollTrigger parallax wrapper.
 * The first child (the image / media) translates upward as the section scrolls,
 * giving the hero a cinematic depth effect. SSR-safe: every GSAP call lives
 * inside useEffect, behind a window guard, and behind prefers-reduced-motion.
 */
export function HeroParallax({
  children,
  className = "",
  strength = 80,
}: {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = ref.current;
    if (!root) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let cleanup = () => {};
    let cancelled = false;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const target = root.querySelector<HTMLElement>("[data-parallax-target]") ?? root.firstElementChild;
      if (!target) return;

      const tween = gsap.to(target, {
        yPercent: strength / 6,
        ease: "none",
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
      cleanup = () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    })();

    return () => cleanup();
  }, [strength]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}