import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Camera-shutter flash cut on route change: two dark blades snap shut at the
 * centre line, then open on a quick warm-white flash. ~0.45s, pointer-transparent.
 * Skipped on the first render, inside the dashboard/admin, and for reduced motion.
 */
const QUIET = /^\/(dashboard|admin|notifications)/;

export function ShutterFlash({ pathname }: { pathname: string }) {
  const reduce = useReducedMotion();
  const prev = useRef(pathname);
  const [shot, setShot] = useState(0);

  useEffect(() => {
    if (prev.current === pathname) return;
    const quiet = QUIET.test(pathname) && QUIET.test(prev.current);
    prev.current = pathname;
    if (!quiet && !reduce) setShot((n) => n + 1);
  }, [pathname, reduce]);

  useEffect(() => {
    if (!shot) return;
    const t = window.setTimeout(() => setShot(0), 650);
    return () => window.clearTimeout(t);
  }, [shot]);

  if (!shot) return null;

  const blade = { duration: 0.34, times: [0, 0.4, 0.55, 1], ease: [0.7, 0, 0.3, 1] as const };
  return (
    <div key={shot} aria-hidden className="pointer-events-none fixed inset-0 z-[9998]">
      <motion.div
        className="absolute inset-x-0 top-0 h-1/2 origin-top bg-[#1A1513]"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: [0, 1, 1, 0] }}
        transition={blade}
      />
      <motion.div
        className="absolute inset-x-0 bottom-0 h-1/2 origin-bottom bg-[#1A1513]"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: [0, 1, 1, 0] }}
        transition={blade}
      />
      <motion.div
        className="absolute inset-0 bg-[#FFF8F3]"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 0.9, 0] }}
        transition={{ duration: 0.5, times: [0, 0.45, 0.55, 1], ease: "easeOut" }}
      />
    </div>
  );
}
