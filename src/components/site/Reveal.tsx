import { useEffect, useRef, useState, type ReactNode } from "react";
import { useIntro } from "@/lib/intro";
import { animate, motion, useInView } from "framer-motion";

/**
 * Quiet, one-shot entrance helpers for existing page details (gold rules,
 * script words, captions, icons, frames). Each plays once, when seen.
 */

export const EASE_DRAW = [0.65, 0, 0.35, 1] as const;
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** true once the element has been at least `amount` visible (or after mount when `onMount`). */
export function useSeen<T extends Element>(amount = 0.6, onMount = false) {
  const ref = useRef<T>(null);
  const intro = useIntro();
  const inView = useInView(ref, { once: true, amount });
  const [mounted, setMounted] = useState(false);
  useEffect(() => { if (onMount) setMounted(true); }, [onMount]);
  // return visits: everything is simply "already seen", so it renders finished
  return [ref, !intro || (onMount ? mounted : inView)] as const;
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
  const intro = useIntro();
  return (
    <span ref={ref} className={on && intro ? "shimmer-once" : undefined} style={on ? { animationDelay: `${delay}s` } : undefined}>
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

const arNum = new Intl.NumberFormat("ar-EG");

/** A number that counts up (Arabic-Indic digits) the first time it is seen. */
export function CountTo({ from = 0, to, delay = 0, duration = 1.6, onMount = false, decimals = 0, locale }: { from?: number; to: number; delay?: number; duration?: number; onMount?: boolean; decimals?: number; /** e.g. "en" to keep Latin digits */ locale?: string }) {
  const [ref, on] = useSeen<HTMLSpanElement>(0.8, onMount);
  const intro = useIntro();
  const [val, setVal] = useState(intro ? from : to);
  const fmt = locale || decimals
    ? new Intl.NumberFormat(locale ?? "ar-EG", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : arNum;
  useEffect(() => {
    if (!on) return;
    if (!intro || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setVal(to); return; }
    const k = 10 ** decimals;
    const c = animate(from, to, { duration, delay, ease: EASE_OUT, onUpdate: (v) => setVal(Math.round(v * k) / k) });
    return () => c.stop();
  }, [on, from, to, delay, duration, decimals, intro]);
  return <span ref={ref} className="tabular-nums">{fmt.format(val)}</span>;
}

/** Wraps a stroked line icon (lucide) so its strokes draw themselves when seen. */
export function DrawIcon({ children, delay = 0, duration = 1.1 }: { children: ReactNode; delay?: number; duration?: number }) {
  const [ref, on] = useSeen<HTMLSpanElement>(1);
  const intro = useIntro();
  useEffect(() => {
    const root = ref.current;
    if (!root || !intro) return;
    const shapes = Array.from(root.querySelectorAll<SVGGeometryElement>("path,circle,rect,line,polyline,polygon,ellipse"));
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    shapes.forEach((el) => {
      const len = el.getTotalLength?.() ?? 0;
      if (!len) return;
      el.style.strokeDasharray = `${len}`;
      el.style.strokeDashoffset = on ? "0" : `${len}`;
      el.style.transition = on ? `stroke-dashoffset ${duration}s cubic-bezier(0.65,0,0.35,1) ${delay}s` : "none";
    });
  }, [on, delay, duration, ref, intro]);
  return <span ref={ref} className="inline-flex">{children}</span>;
}

/**
 * Gold frame that draws itself around a card. Put it inside a `relative` card
 * whose own border is transparent (same width) so the layout doesn't shift.
 */
export function DrawFrame({ className = "text-gold", width = 2, radius = 2, delay = 0, duration = 1.8, fade = false }: { className?: string; width?: number; radius?: number; delay?: number; duration?: number; /** fade the drawn line away afterwards, leaving the card's own border */ fade?: boolean }) {
  const [ref, on] = useSeen<SVGSVGElement>(0.5);
  const half = width / 2;
  return (
    <svg ref={ref} aria-hidden className={`pointer-events-none absolute overflow-visible ${className}`} style={{ inset: -half, width: `calc(100% + ${width}px)`, height: `calc(100% + ${width}px)` }}>
      {/* the svg spans the border's centre line, so a 100% rect strokes exactly over it */}
      <motion.g
        animate={{ opacity: on && fade ? 0 : 1 }}
        transition={{ duration: 1.2, delay: on && fade ? delay + duration + 0.4 : 0, ease: "easeOut" }}
      >
      <motion.rect
        x={0}
        y={0}
        width="100%"
        height="100%"
        rx={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={width}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: on ? 1 : 0 }}
        transition={{ duration, delay, ease: EASE_DRAW }}
      />
      </motion.g>
    </svg>
  );
}

/**
 * A heading whose words rise out of a soft blur one after another, on first
 * build. Words (never letters) so Arabic joining is untouched. `lines` render
 * with a line break between them from `sm` up, matching the old `<br>` markup.
 */
export function RevealWords({ lines, delay = 0.15, step = 0.09 }: { lines: string[]; delay?: number; step?: number }) {
  const intro = useIntro();
  let n = 0;
  return (
    <>
      {lines.map((line, li) => (
        <span key={li}>
          {li > 0 && <br className="hidden sm:block" />}
          {line.split(" ").map((w, wi, arr) => {
            const i = n++;
            return (
              <motion.span
                key={wi}
                className="inline-block"
                initial={intro ? { opacity: 0, y: "0.5em", filter: "blur(4px)" } : false}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.9, delay: delay + i * step, ease: EASE_OUT }}
              >
                {w}
                {wi < arr.length - 1 || li < lines.length - 1 ? " " : ""}
              </motion.span>
            );
          })}
        </span>
      ))}
    </>
  );
}

/** A block (card, row) that rises in when it scrolls into view; `index` staggers siblings. */
export function RiseIn({ children, className = "", index = 0, cols = 3 }: { children: ReactNode; className?: string; index?: number; cols?: number }) {
  const intro = useIntro();
  return (
    <motion.div
      className={className}
      initial={intro ? { opacity: 0, y: 36 } : false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.9, delay: (index % cols) * 0.12, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}
