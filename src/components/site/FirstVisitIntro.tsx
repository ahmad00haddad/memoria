import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * The one-time opening — deliberately big, unlike the soft page entrances.
 * Shown on a browser's first visit only (see lib/intro), ~4s, skippable.
 *
 *  0.0s  the gem's 21 facets fly in from scattered, spinning positions and snap
 *        together with an overshooting spring
 *  1.3s  impact: the gem punches, a gold flash, a shockwave ring
 *  1.6s  M-E-M-O-R-I-A drops in letter by letter, a gold rule whips across,
 *        then the Arabic name
 *  2.9s  an arch (the site's photo-frame shape) opens from the centre until it
 *        fills the screen, revealing the page — whose own entrance replays via
 *        onReveal so it builds as the arch opens
 *
 * Rendered on the server for first visits, so the page never flashes first.
 */

type Facet = { pts: string; fill: "lt" | "md" | "dk" };
const C = "256,256";
const FACETS: Facet[] = [
  { pts: `${C} 216.1,173.1 256,46`, fill: "lt" },
  { pts: `${C} 256,46 295.9,173.1`, fill: "lt" },
  { pts: "256,46 295.9,173.1 420.2,125.1", fill: "md" },
  { pts: `${C} 295.9,173.1 420.2,125.1`, fill: "md" },
  { pts: `${C} 420.2,125.1 345.7,235.5`, fill: "md" },
  { pts: "420.2,125.1 345.7,235.5 460.7,302.7", fill: "dk" },
  { pts: `${C} 345.7,235.5 460.7,302.7`, fill: "dk" },
  { pts: `${C} 460.7,302.7 327.9,313.4`, fill: "dk" },
  { pts: "460.7,302.7 327.9,313.4 347.1,445.2", fill: "dk" },
  { pts: `${C} 327.9,313.4 347.1,445.2`, fill: "dk" },
  { pts: `${C} 347.1,445.2 256,348`, fill: "dk" },
  { pts: "347.1,445.2 256,348 164.9,445.2", fill: "dk" },
  { pts: `${C} 256,348 164.9,445.2`, fill: "dk" },
  { pts: `${C} 164.9,445.2 184.1,313.4`, fill: "md" },
  { pts: "164.9,445.2 184.1,313.4 51.3,302.7", fill: "dk" },
  { pts: `${C} 184.1,313.4 51.3,302.7`, fill: "md" },
  { pts: `${C} 51.3,302.7 166.3,235.5`, fill: "lt" },
  { pts: "51.3,302.7 166.3,235.5 91.8,125.1", fill: "md" },
  { pts: `${C} 166.3,235.5 91.8,125.1`, fill: "lt" },
  { pts: `${C} 91.8,125.1 216.1,173.1`, fill: "lt" },
  { pts: "91.8,125.1 216.1,173.1 256,46", fill: "md" },
];

// deterministic scatter (same on server and client — no Math.random in render)
const rnd = (i: number, k: number) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const SCATTER = FACETS.map((_, i) => ({
  x: (rnd(i, 1) - 0.5) * 1400,
  y: (rnd(i, 2) - 0.5) * 1100,
  r: (rnd(i, 3) - 0.5) * 540,
  s: 0.3 + rnd(i, 4) * 1.6,
}));

const BG = "#1A1513";
const ARCH = "M0 140V50A50 50 0 0 1 100 50V140Z"; // 100×140 arch, centred below
const LETTERS = "MEMORIA".split("");
const REVEAL_AT = 2900;
const DONE_AT = 4100;

export function FirstVisitIntro({ onReveal }: { onReveal: () => void }) {
  const [phase, setPhase] = useState<"play" | "reveal" | "done">("play");

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    const reveal = () => setPhase((p) => (p === "play" ? "reveal" : p));
    const t1 = window.setTimeout(reveal, reduce ? 300 : REVEAL_AT);
    const t2 = window.setTimeout(() => setPhase("done"), reduce ? 700 : DONE_AT);
    const skip = () => reveal();
    window.addEventListener("keydown", skip);
    window.addEventListener("wheel", skip, { passive: true });
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("wheel", skip);
      html.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    if (phase === "reveal") {
      onReveal();
      // a skip can land early; make sure the overlay still leaves
      const t = window.setTimeout(() => setPhase("done"), 1200);
      return () => window.clearTimeout(t);
    }
    if (phase === "done") document.documentElement.style.overflow = "";
  }, [phase, onReveal]);

  if (phase === "done") return null;
  const revealing = phase === "reveal";

  return (
    <div
      aria-hidden
      onClick={() => setPhase((p) => (p === "play" ? "reveal" : p))}
      className="fixed inset-0 z-[9999] cursor-pointer select-none overflow-hidden"
    >
      {/* the dark stage, with an arch-shaped window that opens on reveal */}
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1000 1000">
        <defs>
          <mask id="fvi-arch" maskUnits="userSpaceOnUse" x="-5000" y="-5000" width="11000" height="11000">
            <rect x="-5000" y="-5000" width="11000" height="11000" fill="white" />
            {/* the g places the arch at the stage centre; the path scales about its own middle */}
            <g transform="translate(450 330)">
              <motion.path
                d={ARCH}
                fill="black"
                style={{ transformOrigin: "50% 60%", transformBox: "fill-box" }}
                initial={{ scale: 0 }}
                animate={{ scale: revealing ? 26 : 0 }}
                transition={{ duration: 1.1, ease: [0.76, 0, 0.24, 1] }}
              />
            </g>
          </mask>
        </defs>
        <rect x="-5000" y="-5000" width="11000" height="11000" fill={BG} mask="url(#fvi-arch)" />
      </svg>

      {/* everything on stage zooms through and fades as the arch opens */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center"
        animate={revealing ? { scale: 1.6, opacity: 0, filter: "blur(6px)" } : { scale: 1, opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
      >
        {/* impact flash */}
        <motion.div
          className="pointer-events-none absolute inset-0 bg-[#FFF3E2]"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0, 0.85, 0] }}
          transition={{ duration: 0.9, delay: 1.15, times: [0, 0.18, 0.3, 1], ease: "easeOut" }}
        />
        {/* shockwave ring */}
        <motion.div
          className="pointer-events-none absolute left-1/2 top-[42%] h-[40vmin] w-[40vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#D8B49E]"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 0, 5.5], opacity: [0, 1, 0] }}
          transition={{ duration: 1.3, delay: 1.2, times: [0, 0.05, 1], ease: [0.22, 1, 0.36, 1] }}
        />

        {/* the gem, assembled from flying shards */}
        <motion.svg
          viewBox="0 0 512 512"
          className="relative h-[38vmin] w-[38vmin] min-h-[160px] min-w-[160px] overflow-visible"
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1, 1.22, 0.96, 1] }}
          transition={{ duration: 0.8, delay: 1.1, times: [0, 0.1, 0.35, 0.7, 1] }}
        >
          <defs>
            <linearGradient id="fvi-lt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F6E6DA" /><stop offset="1" stopColor="#D8B49E" /></linearGradient>
            <linearGradient id="fvi-md" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#D8B49E" /><stop offset="1" stopColor="#9E6B55" /></linearGradient>
            <linearGradient id="fvi-dk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9E6B55" /><stop offset="1" stopColor="#4A2E22" /></linearGradient>
          </defs>
          {FACETS.map((f, i) => (
            <motion.polygon
              key={i}
              points={f.pts}
              fill={`url(#fvi-${f.fill})`}
              style={{ transformOrigin: "256px 256px", transformBox: "view-box" }}
              initial={{ x: SCATTER[i].x, y: SCATTER[i].y, rotate: SCATTER[i].r, scale: SCATTER[i].s, opacity: 0 }}
              animate={{ x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 120,
                damping: 11,
                mass: 0.9,
                delay: 0.15 + (i % 7) * 0.06 + Math.floor(i / 7) * 0.05,
                opacity: { duration: 0.25, delay: 0.15 + (i % 7) * 0.06 },
              }}
            />
          ))}
          <motion.polygon
            points="256,46 295.9,173.1 420.2,125.1 345.7,235.5 460.7,302.7 327.9,313.4 347.1,445.2 256,348 164.9,445.2 184.1,313.4 51.3,302.7 166.3,235.5 91.8,125.1 216.1,173.1"
            fill="none"
            stroke="#FFF8F3"
            strokeWidth="3"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: [0, 0.9, 0.5] }}
            transition={{ duration: 0.7, delay: 1.15, ease: "easeOut" }}
          />
        </motion.svg>

        {/* the name drops in, letter by letter, with overshoot */}
        <div className="relative mt-8 flex flex-col items-center" dir="ltr">
          <div className="flex font-serif text-[clamp(3rem,11vmin,6.5rem)] font-semibold leading-none tracking-[0.12em] text-[#FFF8F3]">
            {LETTERS.map((ch, i) => (
              <motion.span
                key={i}
                className="inline-block"
                initial={{ y: -140, rotate: (rnd(i, 9) - 0.5) * 50, opacity: 0, scale: 1.6 }}
                animate={{ y: 0, rotate: 0, opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 380, damping: 14, delay: 1.55 + i * 0.07 }}
              >
                {ch}
              </motion.span>
            ))}
          </div>
          <motion.div
            className="mt-4 h-[2px] w-[min(70vw,520px)] origin-left bg-gradient-to-r from-transparent via-[#D8B49E] to-transparent"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.55, delay: 2.1, ease: [0.76, 0, 0.24, 1] }}
          />
          <motion.div
            dir="rtl"
            lang="ar"
            className="mt-4 text-[clamp(1.6rem,5vmin,2.4rem)] font-bold text-[#D8B49E]"
            style={{ fontFamily: "Amiri, serif" }}
            initial={{ opacity: 0, y: 18, letterSpacing: "0.4em" }}
            animate={{ opacity: 1, y: 0, letterSpacing: "0em" }}
            transition={{ duration: 0.8, delay: 2.3, ease: [0.22, 1, 0.36, 1] }}
          >
            ميموريا
          </motion.div>
        </div>
      </motion.div>

      {/* a quiet skip hint */}
      <AnimatePresence>
        {!revealing && (
          <motion.div
            className="absolute bottom-6 inset-x-0 text-center text-[11px] tracking-[0.3em] text-[#FFF8F3]/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            انقري للتخطّي
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
