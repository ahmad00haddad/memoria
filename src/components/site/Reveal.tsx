import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useInView } from "framer-motion";

/**
 * Quiet, one-shot entrance helpers for existing page details (gold rules,
 * script words, captions). They animate from React state rather than
 * `initial`, because the root AnimatePresence has initial={false}, which
 * skips `initial` on first load.
 */

export const EASE_DRAW = [0.65, 0, 0.35, 1] as const;
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** true once the element has been at least `amount` visible (or after mount when `onMount`). */
export function useSeen<T extends Element>(amount = 0.6, onMount = false) {
  const ref = useRef<T>(null);
  const inView = useInView(ref, { once: true, amount });
  const [mounted, setMounted] = useState(false);
  useEffect(() => { if (onMount) setMounted(true); }, [onMount]);
  return [ref, onMount ? mounted : inView] as const;
}

/** A hairline that draws itself from `from` (the reading start in RTL is "right"). */
export function DrawRule({
  className = "",
  from = "right",
  delay = 0,
  duration = 1.2,
  onMount = false,
}: {
  className?: string;
  from?: "left" | "right";
  delay?: number;
  duration?: number;
  onMount?: boolean;
}) {
  const [ref, on] = useSeen<HTMLSpanElement>(1, onMount);
  return (
    <motion.span
      ref={ref}
      aria-hidden
      className={`${from === "right" ? "origin-right" : "origin-left"} ${className}`}
      animate={{ scaleX: on ? 1 : 0 }}
      transition={{ duration, delay, ease: EASE_DRAW }}
    />
  );
}

/** Gold script text that a single soft band of light sweeps across, once. */
export function Shimmer({ children, delay = 0, onMount = false }: { children: ReactNode; delay?: number; onMount?: boolean }) {
  const [ref, on] = useSeen<HTMLSpanElement>(0.8, onMount);
  return (
    <span ref={ref} className={on ? "shimmer-once" : undefined} style={on ? { animationDelay: `${delay}s` } : undefined}>
      {children}
    </span>
  );
}

/** Characters that appear one after another (for short Latin captions). */
export function TypeIn({ text, delay = 0, step = 0.045, onMount = false }: { text: string; delay?: number; step?: number; onMount?: boolean }) {
  const [ref, on] = useSeen<HTMLSpanElement>(0.8, onMount);
  return (
    <span ref={ref} aria-label={text}>
      {text.split("").map((ch, i) => (
        <motion.span
          key={i}
          aria-hidden
          animate={{ opacity: on ? 1 : 0 }}
          transition={{ duration: 0.35, delay: delay + i * step, ease: "easeOut" }}
        >
          {ch}
        </motion.span>
      ))}
    </span>
  );
}

/** Fades and settles a decorative element in slowly when it scrolls into view. */
export function SettleIn({ children, className = "", delay = 0, scale = 0.86 }: { children: ReactNode; className?: string; delay?: number; scale?: number }) {
  const [ref, on] = useSeen<HTMLSpanElement>(0.3);
  return (
    <motion.span
      ref={ref}
      aria-hidden
      className={className}
      animate={on ? { opacity: 1, scale: 1 } : { opacity: 0, scale }}
      transition={{ duration: 1.8, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.span>
  );
}

/** An image that rises into its frame from the bottom edge (clip only, so hover scaling still works). */
export function RiseImg({ className = "", delay = 0, ...img }: React.ImgHTMLAttributes<HTMLImageElement> & { delay?: number }) {
  const [ref, on] = useSeen<HTMLImageElement>(0.25);
  return (
    <motion.img
      ref={ref}
      {...(img as object)}
      className={className}
      animate={{ clipPath: on ? "inset(0% 0% 0% 0%)" : "inset(100% 0% 0% 0%)" }}
      transition={{ duration: 1.3, delay, ease: EASE_OUT }}
    />
  );
}
