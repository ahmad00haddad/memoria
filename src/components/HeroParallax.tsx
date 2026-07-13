import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

/**
 * Client-only parallax wrapper — powered by framer-motion
 * (replaces GSAP/ScrollTrigger — ~40KB bundle savings)
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
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", `${strength / 6}%`]);

  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y }} className="will-change-transform">
        {children}
      </motion.div>
    </div>
  );
}