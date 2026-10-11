import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Memoria intro splash — "the day develops".
 * The 7-spoke mark opens like a camera aperture: spokes draw out from a single
 * point, the 21 facets bloom clockwise (light → deep), a flash settles the gem,
 * then the wordmark resolves letter by letter. Shown once per session; click or
 * key to skip; honours prefers-reduced-motion. Pure SVG + framer-motion, no assets.
 */

const SEEN_KEY = "memoria.splash-seen";
const SHOW_MS = 3600;

type Facet = { pts: string; fill: "lt" | "md" | "dk"; op?: number };
const C = "256,256";
const FACETS: Facet[] = [
  { pts: `${C} 216.1,173.1 256,46`, fill: "lt" },
  { pts: `${C} 256,46 295.9,173.1`, fill: "lt" },
  { pts: "256,46 295.9,173.1 420.2,125.1", fill: "md", op: 0.92 },
  { pts: `${C} 295.9,173.1 420.2,125.1`, fill: "md" },
  { pts: `${C} 420.2,125.1 345.7,235.5`, fill: "md" },
  { pts: "420.2,125.1 345.7,235.5 460.7,302.7", fill: "dk", op: 0.92 },
  { pts: `${C} 345.7,235.5 460.7,302.7`, fill: "dk" },
  { pts: `${C} 460.7,302.7 327.9,313.4`, fill: "dk" },
  { pts: "460.7,302.7 327.9,313.4 347.1,445.2", fill: "dk", op: 0.92 },
  { pts: `${C} 327.9,313.4 347.1,445.2`, fill: "dk" },
  { pts: `${C} 347.1,445.2 256,348`, fill: "dk" },
  { pts: "347.1,445.2 256,348 164.9,445.2", fill: "dk", op: 0.92 },
  { pts: `${C} 256,348 164.9,445.2`, fill: "dk" },
  { pts: `${C} 164.9,445.2 184.1,313.4`, fill: "md" },
  { pts: "164.9,445.2 184.1,313.4 51.3,302.7", fill: "dk", op: 0.92 },
  { pts: `${C} 184.1,313.4 51.3,302.7`, fill: "md" },
  { pts: `${C} 51.3,302.7 166.3,235.5`, fill: "lt" },
  { pts: "51.3,302.7 166.3,235.5 91.8,125.1", fill: "md", op: 0.92 },
  { pts: `${C} 166.3,235.5 91.8,125.1`, fill: "lt" },
  { pts: `${C} 91.8,125.1 216.1,173.1`, fill: "lt" },
  { pts: "91.8,125.1 216.1,173.1 256,46", fill: "md", op: 0.92 },
];
const SPOKES = [
  [256, 46], [420.2, 125.1], [460.7, 302.7], [347.1, 445.2], [164.9, 445.2], [51.3, 302.7], [91.8, 125.1],
];
const RIM = "256,46 420.2,125.1 460.7,302.7 347.1,445.2 164.9,445.2 51.3,302.7 91.8,125.1";
const EASE = [0.22, 1, 0.36, 1] as const;

export function Splash() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(SEEN_KEY) === "1"; } catch { /* ignore */ }
    // ?splash replays it regardless (for previewing)
    if (new URLSearchParams(window.location.search).has("splash")) seen = false;
    if (seen) { setShow(false); return; }
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(() => setShow(false), reduce ? 900 : SHOW_MS);
    const skip = () => setShow(false);
    window.addEventListener("keydown", skip, { once: true });
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", skip);
      document.documentElement.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (show) return;
    document.documentElement.style.overflow = "";
    // Marked only once it has actually played, so StrictMode's double effect can't skip it
    try { sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* ignore */ }
  }, [show]);

  const letters = "Memoria".split("");

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          id="memoria-splash"
          role="presentation"
          aria-hidden="true"
          onClick={() => setShow(false)}
          className="fixed inset-0 z-[9999] flex cursor-pointer flex-col items-center justify-center overflow-hidden"
          style={{ background: "#1A1513" }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.06, filter: "blur(10px)", transition: { duration: 0.7, ease: EASE } }}
        >
          {/* ambient bloom */}
          <motion.div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[90vmin] w-[90vmin] -translate-x-1/2 -translate-y-[58%] rounded-full"
            style={{ background: "radial-gradient(closest-side, rgba(216,180,158,.28), rgba(216,180,158,0))" }}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: [0, 0.4, 1, 0.7], scale: [0.4, 0.7, 1.15, 1] }}
            transition={{ duration: 2.4, delay: 0.3, ease: "easeOut", times: [0, 0.3, 0.6, 1] }}
          />

          <motion.svg
            viewBox="0 0 512 512"
            className="relative h-[34vmin] w-[34vmin] min-h-[150px] min-w-[150px] max-h-[280px] max-w-[280px] overflow-visible"
            initial={{ rotate: -40, scale: 0.85 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ duration: 2.2, ease: EASE }}
          >
            <defs>
              <linearGradient id="sp-lt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F6E6DA" /><stop offset="1" stopColor="#D8B49E" /></linearGradient>
              <linearGradient id="sp-md" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#D8B49E" /><stop offset="1" stopColor="#9E6B55" /></linearGradient>
              <linearGradient id="sp-dk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9E6B55" /><stop offset="1" stopColor="#4A2E22" /></linearGradient>
              <radialGradient id="sp-glow" cx="0.5" cy="0.45" r="0.5"><stop offset="0" stopColor="#FFF8F3" stopOpacity=".9" /><stop offset="1" stopColor="#FFF8F3" stopOpacity="0" /></radialGradient>
            </defs>

            {/* spokes draw out from the centre point */}
            {SPOKES.map(([x, y], i) => (
              <motion.line
                key={i} x1="256" y1="256" x2={x} y2={y}
                stroke="#FFF8F3" strokeWidth="1.5" strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: [0, 0.8, 0.25] }}
                transition={{ duration: 1, delay: 0.25 + i * 0.07, ease: EASE }}
              />
            ))}

            {/* facets bloom clockwise, each from the centre */}
            {FACETS.map((f, i) => (
              <motion.polygon
                key={i} points={f.pts} fill={`url(#sp-${f.fill})`}
                style={{ transformOrigin: "256px 256px" }}
                initial={{ opacity: 0, scale: 0.2 }}
                animate={{ opacity: f.op ?? 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.55 + i * 0.045, ease: EASE }}
              />
            ))}

            {/* rim strokes draw round the gem */}
            <motion.polygon
              points={RIM} fill="none" stroke="#FFF8F3" strokeOpacity=".5" strokeWidth="2.5" strokeLinejoin="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: 1.4, delay: 0.9, ease: "easeInOut" }}
            />

            {/* flash as the gem settles */}
            <motion.circle
              cx="256" cy="230" r="150" fill="url(#sp-glow)"
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: [0, 0, 1, 0.55], scale: [0.3, 0.3, 1.25, 1] }}
              style={{ transformOrigin: "256px 230px" }}
              transition={{ duration: 1.6, delay: 1.1, times: [0, 0.2, 0.55, 1], ease: "easeOut" }}
            />
          </motion.svg>

          {/* wordmark */}
          <div className="relative mt-7 flex flex-col items-center" dir="ltr">
            <div className="flex font-serif text-[clamp(2.6rem,9vmin,4.5rem)] font-semibold leading-none tracking-[0.04em]" style={{ color: "#FFF8F3" }}>
              {letters.map((ch, i) => (
                <motion.span
                  key={i} className="inline-block"
                  initial={{ opacity: 0, y: 26, filter: "blur(12px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.8, delay: 1.7 + i * 0.07, ease: EASE }}
                >
                  {ch}
                </motion.span>
              ))}
            </div>

            <motion.div
              className="mt-3 h-px w-40"
              style={{ background: "linear-gradient(90deg, transparent, #D8B49E, transparent)", transformOrigin: "center" }}
              initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.9, delay: 2.2, ease: EASE }}
            />

            <motion.div
              dir="rtl" lang="ar"
              className="mt-3 text-[clamp(1.4rem,4.4vmin,2rem)] font-bold"
              style={{ color: "#D8B49E", fontFamily: "Amiri, serif" }}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 2.35, ease: EASE }}
            >
              ميموريا
            </motion.div>

            <motion.div
              dir="rtl" lang="ar"
              className="mt-2 text-sm tracking-wide"
              style={{ color: "rgba(255,248,243,.6)", fontFamily: "Amiri, serif" }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.9, delay: 2.65 }}
            >
              ذاكرة يومكِ · الأردن
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
