import type { Variants, Transition } from "framer-motion";

const easeOut: Transition["ease"] = [0.22, 1, 0.36, 1];

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easeOut } },
};

export const fadeDown: Variants = {
  hidden: { opacity: 0, y: -24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easeOut } },
};

export const fadeLeft: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: easeOut } },
};

export const fadeRight: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: easeOut } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.7, ease: easeOut } },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

export const float = {
  y: [0, -10, 0],
  transition: { duration: 4.5, repeat: Infinity, ease: "easeInOut" as const },
};

export const buttonHover = { scale: 1.02 } as const;
export const buttonTap = { scale: 0.97 } as const;
export const cardHover = { y: -4, transition: { duration: 0.25, ease: easeOut } } as const;
export const iconHover = { rotate: 6, scale: 1.1 } as const;

export const viewportOnce = { once: true, amount: 0.2 } as const;