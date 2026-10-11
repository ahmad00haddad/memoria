import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";

/**
 * Memoria motion kit — small, composable pieces for the public pages.
 * Every piece degrades to a static render under prefers-reduced-motion and
 * pointer effects only run on fine (mouse) pointers.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

function useFinePointer() {
  const [fine, setFine] = useState(false);
  useEffect(() => {
    setFine(window.matchMedia?.("(hover: hover) and (pointer: fine)").matches ?? false);
  }, []);
  return fine;
}

/** Thin gold reading-progress hairline pinned to the top of the viewport. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });
  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-right bg-gradient-to-l from-gold via-gold/80 to-transparent"
      style={{ scaleX }}
    />
  );
}

/**
 * Headline that rises word by word out of a mask. Splits on words, never
 * letters, so Arabic ligatures stay joined.
 */
export function WordsReveal({
  text,
  className = "",
  delay = 0,
  stagger = 0.09,
  inView = false,
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  inView?: boolean;
}) {
  const words = text.split(" ");
  const trigger = inView
    ? { whileInView: "visible", viewport: { once: true, amount: 0.6 } }
    : { animate: "visible" };
  return (
    <motion.span
      className={className}
      initial="hidden"
      {...trigger}
      transition={{ staggerChildren: stagger, delayChildren: delay }}
      aria-label={text}
    >
      {words.map((w, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden pb-[0.12em] -mb-[0.12em] align-bottom">
          <motion.span
            className="inline-block"
            variants={{
              hidden: { y: "110%", rotate: 4, opacity: 0 },
              visible: { y: "0%", rotate: 0, opacity: 1, transition: { duration: 0.9, ease: EASE } },
            }}
          >
            {w}
          </motion.span>
          {i < words.length - 1 && " "}
        </span>
      ))}
    </motion.span>
  );
}

/**
 * Card that tilts toward the cursor in 3D with a soft gold spotlight that
 * follows the pointer. Plain wrapper on touch devices.
 */
export function TiltCard({
  children,
  className = "",
  max = 7,
  spotlight = true,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  spotlight?: boolean;
}) {
  const fine = useFinePointer();
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 200, damping: 20, mass: 0.4 };
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), spring);
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), spring);
  const sx = useTransform(px, (v) => `${v * 100}%`);
  const sy = useTransform(py, (v) => `${v * 100}%`);
  const glow = useMotionTemplate`radial-gradient(420px circle at ${sx} ${sy}, color-mix(in oklab, var(--gold) 22%, transparent), transparent 60%)`;
  const [hover, setHover] = useState(false);

  if (!fine || reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={`relative [transform-style:preserve-3d] ${className}`}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
      }}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => { setHover(false); px.set(0.5); py.set(0.5); }}
    >
      {children}
      {spotlight && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] mix-blend-soft-light transition-opacity duration-500"
          style={{ background: glow, opacity: hover ? 1 : 0 }}
        />
      )}
    </motion.div>
  );
}

/** Pulls its child gently toward the cursor while hovered (for primary CTAs). */
export function Magnetic({ children, strength = 0.35, className = "" }: { children: ReactNode; strength?: number; className?: string }) {
  const fine = useFinePointer();
  const reduce = useReducedMotion();
  const x = useSpring(0, { stiffness: 220, damping: 15, mass: 0.3 });
  const y = useSpring(0, { stiffness: 220, damping: 15, mass: 0.3 });
  if (!fine || reduce) return <div className={`inline-flex ${className}`}>{children}</div>;
  return (
    <motion.div
      className={`inline-flex ${className}`}
      style={{ x, y }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => { x.set(0); y.set(0); }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Image that drifts inside its frame as the page scrolls, and is unveiled by a
 * curtain wipe the first time it enters the viewport.
 */
export function ParallaxImg({
  src,
  alt,
  className = "",
  imgClassName = "",
  strength = 12,
  reveal = true,
  eager = false,
  width,
  height,
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  strength?: number;
  reveal?: boolean;
  eager?: boolean;
  width?: number;
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [`-${strength}%`, `${strength}%`]);
  return (
    <motion.div
      ref={ref}
      className={`relative overflow-hidden ${className}`}
      initial={reveal && !reduce ? { clipPath: "inset(100% 0% 0% 0%)" } : false}
      whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 1.2, ease: EASE }}
    >
      <motion.img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={eager ? "eager" : "lazy"}
        className={`absolute inset-x-0 -top-[15%] h-[130%] w-full object-cover will-change-transform ${imgClassName}`}
        style={reduce ? undefined : { y }}
        initial={reveal && !reduce ? { scale: 1.25 } : false}
        whileInView={{ scale: 1 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 1.6, ease: EASE }}
      />
    </motion.div>
  );
}

/** The brand gem, slowly turning as the page scrolls — a quiet background motif. */
export function ScrollGem({ className = "", turns = 0.5 }: { className?: string; turns?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const rotate = useTransform(scrollYProgress, [0, 1], [-180 * turns, 180 * turns]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.85, 1, 0.85]);
  return (
    <motion.div ref={ref} aria-hidden className={`pointer-events-none select-none ${className}`} style={reduce ? undefined : { rotate, scale }}>
      <img src="/brand/mark.svg" alt="" className="h-full w-full" />
    </motion.div>
  );
}

/** Gold rule that draws itself across when it scrolls into view. */
export function DrawRule({ className = "", delay = 0 }: { className?: string; delay?: number }) {
  return (
    <motion.span
      aria-hidden
      className={`block h-px origin-right bg-gradient-to-l from-gold to-gold/0 ${className}`}
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, amount: 1 }}
      transition={{ duration: 1.1, delay, ease: EASE }}
    />
  );
}
