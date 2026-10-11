import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";

/**
 * Scroll-scrubbed brand sequence. The section pins for ~3 screens while:
 *  1. a line of type resolves over the spinning Memoria gem,
 *  2. the gem's facets dissolve and its star outline opens like an aperture,
 *     zooming through until the photo behind fills the screen,
 *  3. viewfinder brackets lock focus and the facts scrub in as exposure readouts.
 * Everything is driven by one scroll progress value, so it plays forwards and
 * backwards with the reader. Reduced motion gets the final frame, static.
 */

const STAR = "256,46 295.9,173.1 420.2,125.1 345.7,235.5 460.7,302.7 327.9,313.4 347.1,445.2 256,348 164.9,445.2 184.1,313.4 51.3,302.7 166.3,235.5 91.8,125.1 216.1,173.1";
const C = "256,256";
const FACETS: [string, "lt" | "md" | "dk"][] = [
  [`${C} 216.1,173.1 256,46`, "lt"], [`${C} 256,46 295.9,173.1`, "lt"], [`${C} 295.9,173.1 420.2,125.1`, "md"],
  [`${C} 420.2,125.1 345.7,235.5`, "md"], [`${C} 345.7,235.5 460.7,302.7`, "dk"], [`${C} 460.7,302.7 327.9,313.4`, "dk"],
  [`${C} 327.9,313.4 347.1,445.2`, "dk"], [`${C} 347.1,445.2 256,348`, "dk"], [`${C} 256,348 164.9,445.2`, "dk"],
  [`${C} 164.9,445.2 184.1,313.4`, "md"], [`${C} 184.1,313.4 51.3,302.7`, "md"], [`${C} 51.3,302.7 166.3,235.5`, "lt"],
  [`${C} 166.3,235.5 91.8,125.1`, "lt"], [`${C} 91.8,125.1 216.1,173.1`, "lt"],
];
const IMG = "/demo/layla-cover.jpg";
const BG = "#1A1513";
const arNum = new Intl.NumberFormat("ar-EG");

const LINE_1 = ["ما", "يحدث", "مرّة", "واحدة"];
const LINE_2 = ["يستحق", "مصوّرة", "لا", "تفوّته"];
const FACTS = [
  { from: 40, to: 0, unit: "", label: "رسالة واتساب للحجز", tag: "WA" },
  { from: 0, to: 100, unit: "٪", label: "عربون بإيصال CliQ موثّق", tag: "CLIQ" },
  { from: 0, to: 14, unit: "", label: "يوماً مجاناً للمصوّرات", tag: "TRIAL" },
];

export function ApertureSequence() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });

  // aperture: gem → star-shaped window → full bleed
  // gem starts small, then the aperture accelerates open until it outgrows the screen
  const gemScale = useTransform(p, (v) =>
    v < 0.16 ? 0.22 + (v / 0.16) * 0.2 : 0.42 + Math.pow(Math.min(1, (v - 0.16) / 0.44), 2.6) * 9,
  );
  const gemRotate = useTransform(p, [0, 0.6], [-60, 75]);
  const gemStyle = { scale: gemScale, rotate: gemRotate, transformOrigin: "256px 256px", transformBox: "view-box" as const };
  const facetsOpacity = useTransform(p, [0.14, 0.3], [1, 0]);
  const rimOpacity = useTransform(p, [0.12, 0.22, 0.5, 0.6], [0.3, 1, 1, 0]);
  const photoScale = useTransform(p, [0.15, 1], [1.35, 1.02]);
  const photoBright = useTransform(p, [0.15, 0.55, 0.92, 1], [0.35, 0.8, 0.8, 0.25]);
  const photoFilter = useTransform(photoBright, (b) => `brightness(${b}) saturate(${0.6 + b * 0.5})`);

  const line1Opacity = useTransform(p, [0.24, 0.32], [1, 0]);
  const line1Y = useTransform(p, [0.24, 0.32], [0, -60]);

  const hudInset = useTransform(p, [0.6, 0.7], ["14%", "5%"]);
  const hudOpacity = useTransform(p, [0.6, 0.66, 0.94, 1], [0, 1, 1, 0]);

  if (reduce) {
    return (
      <section className="relative h-[90vh] overflow-hidden" style={{ background: BG }}>
        <img src={IMG} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
        <div className="relative flex h-full flex-col items-center justify-center gap-10 px-6 text-center text-ivory">
          <h2 className="font-serif text-5xl sm:text-7xl">{LINE_2.join(" ")}</h2>
          <Readouts p={null} />
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} className="relative h-[340vh]" style={{ background: BG }} aria-label="ميموريا">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {/* the photo behind the aperture */}
        <motion.img
          src={IMG}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover will-change-transform"
          style={{ scale: photoScale, filter: photoFilter }}
        />
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(26,21,19,.75))]" />

        {/* dark plate with a gem-shaped hole */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 512 512" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <defs>
            <mask id="ap-hole" maskUnits="userSpaceOnUse" x="-4000" y="-4000" width="8512" height="8512">
              <rect x="-4000" y="-4000" width="8512" height="8512" fill="white" />
              <motion.g style={gemStyle}>
                <polygon points={STAR} fill="black" />
              </motion.g>
            </mask>
            <linearGradient id="ap-lt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F6E6DA" /><stop offset="1" stopColor="#D8B49E" /></linearGradient>
            <linearGradient id="ap-md" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#D8B49E" /><stop offset="1" stopColor="#9E6B55" /></linearGradient>
            <linearGradient id="ap-dk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9E6B55" /><stop offset="1" stopColor="#4A2E22" /></linearGradient>
          </defs>
          <rect x="-4000" y="-4000" width="8512" height="8512" fill={BG} mask="url(#ap-hole)" />
          <motion.g style={gemStyle}>
            <motion.g style={{ opacity: facetsOpacity }}>
              {FACETS.map(([pts, f], i) => <polygon key={i} points={pts} fill={`url(#ap-${f})`} />)}
            </motion.g>
            <motion.polygon
              points={STAR}
              fill="none"
              stroke="#D8B49E"
              strokeWidth={1.2}
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
              style={{ opacity: rimOpacity }}
            />
          </motion.g>
        </svg>

        {/* line 1, over the gem */}
        <motion.div className="absolute inset-x-0 top-[13%] px-6 text-center" style={{ opacity: line1Opacity, y: line1Y }}>
          <div className="mb-4 font-serif text-xs uppercase tracking-[0.5em] text-gold/70" dir="ltr">Memoria</div>
          <h2 className="font-serif text-[clamp(2.4rem,7vw,6rem)] leading-[1.1] text-ivory">
            {LINE_1.map((w, i) => <ScrubWord key={i} p={p} at={0.02 + i * 0.035} word={w} />)}
          </h2>
        </motion.div>

        {/* viewfinder HUD */}
        <motion.div aria-hidden className="pointer-events-none absolute" style={{ inset: hudInset, opacity: hudOpacity }}>
          {(["top-0 start-0 border-t border-s", "top-0 end-0 border-t border-e", "bottom-0 start-0 border-b border-s", "bottom-0 end-0 border-b border-e"] as const).map((c) => (
            <span key={c} className={`absolute h-10 w-10 border-ivory/80 sm:h-16 sm:w-16 ${c}`} />
          ))}
          <div className="absolute start-0 top-0 flex translate-y-[-150%] items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-ivory/70 sm:text-xs" dir="ltr">
            <motion.span className="h-2 w-2 rounded-full bg-[#E5484D]" animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
            REC · 35mm · f/1.8 · 1/250
          </div>
          <span className="absolute left-1/2 top-1/2 h-6 w-px -translate-x-1/2 -translate-y-1/2 bg-ivory/50" />
          <span className="absolute left-1/2 top-1/2 h-px w-6 -translate-x-1/2 -translate-y-1/2 bg-ivory/50" />
        </motion.div>

        <motion.div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#1A1513]/90 to-transparent" style={{ opacity: hudOpacity }} />

        {/* line 2 + readouts, inside the frame */}
        <div className="absolute inset-0 flex flex-col items-center justify-end gap-10 px-6 pb-[12vh] text-center sm:gap-14">
          <h2 className="font-serif text-[clamp(2.4rem,7.5vw,6.5rem)] leading-[1.05] text-ivory drop-shadow-[0_4px_30px_rgba(0,0,0,.5)]">
            {LINE_2.map((w, i) => (
              <ScrubWord key={i} p={p} at={0.6 + i * 0.03} out={0.94} word={w} className={i === 1 ? "font-script text-gold" : ""} />
            ))}
          </h2>
          <Readouts p={p} />
        </div>
      </div>
    </section>
  );
}

/** A word that rises out of blur at scroll position `at` (and leaves at `out`). */
function ScrubWord({ p, at, out, word, className = "" }: { p: MotionValue<number>; at: number; out?: number; word: string; className?: string }) {
  const range = out ? [at, at + 0.06, out, out + 0.05] : [at, at + 0.06];
  const opacity = useTransform(p, range, out ? [0, 1, 1, 0] : [0, 1]);
  const y = useTransform(p, [at, at + 0.07], [50, 0]);
  const blur = useTransform(p, [at, at + 0.06], [14, 0]);
  const filter = useTransform(blur, (b) => `blur(${b}px)`);
  return (
    <motion.span className={`inline-block px-[0.12em] ${className}`} style={{ opacity, y, filter }}>
      {word}
    </motion.span>
  );
}

function Readouts({ p }: { p: MotionValue<number> | null }) {
  return (
    <div className="grid w-full max-w-3xl grid-cols-3 gap-2 sm:gap-6">
      {FACTS.map((f, i) => <Readout key={f.tag} f={f} p={p} at={0.68 + i * 0.04} />)}
    </div>
  );
}

function Readout({ f, p, at }: { f: (typeof FACTS)[number]; p: MotionValue<number> | null; at: number }) {
  const fallback = useTransform(() => 1);
  const src = p ?? fallback;
  const n = useTransform(src, [at, at + 0.1], [f.from, f.to], { clamp: true });
  const text = useTransform(n, (v) => arNum.format(Math.round(p ? v : f.to)) + f.unit);
  const opacity = useTransform(src, p ? [at - 0.02, at + 0.03, 0.94, 0.99] : [0, 1], p ? [0, 1, 1, 0] : [1, 1]);
  const bar = useTransform(src, [at, at + 0.1], ["0%", "100%"]);
  return (
    <motion.div className="relative border-t border-ivory/25 pt-3 text-start" style={{ opacity }}>
      <motion.span aria-hidden className="absolute -top-px start-0 h-px bg-gold" style={{ width: p ? bar : "100%" }} />
      <div className="mb-1 font-mono text-[9px] tracking-[0.3em] text-gold/80 sm:text-[10px]" dir="ltr">{f.tag}</div>
      <motion.div className="font-serif text-3xl tabular-nums text-ivory sm:text-5xl">{text}</motion.div>
      <div className="mt-1 text-[11px] leading-snug text-ivory/60 sm:text-sm">{f.label}</div>
    </motion.div>
  );
}
