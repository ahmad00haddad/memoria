import { useReducedMotion } from "framer-motion";
import type { Variants } from "framer-motion";

/**
 * Returns a safe variants object that respects prefers-reduced-motion.
 * When reduced motion is requested, transforms are stripped and only opacity remains.
 */
export function useSafeVariants(variants: Variants): Variants {
  const reduce = useReducedMotion();
  if (!reduce) return variants;
  const out: Variants = {};
  for (const key of Object.keys(variants)) {
    const v = variants[key];
    if (typeof v === "object" && v !== null) {
      out[key] = { opacity: (v as any).opacity ?? 1, transition: { duration: 0.2 } };
    } else {
      out[key] = v as any;
    }
  }
  return out;
}

export function useMotionEnabled() {
  const reduce = useReducedMotion();
  return !reduce;
}