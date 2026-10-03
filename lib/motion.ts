import type { Variants } from "framer-motion";

/**
 * FFDGN motion language — premium but restrained.
 * Only transform + opacity are ever animated (no layout repaints).
 * Institutional pacing: deliberate entrances, never bouncy.
 */

/** Ultra-smooth ease-out for sleek UI motion. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
/** Slightly warmer curve for editorial reveals. */
export const EASE_EDITORIAL = [0.25, 1, 0.5, 1] as const;

/** Subtle institutional spring — settles, never oscillates visibly. */
export const SPRING_CALM = { type: "spring", mass: 1, stiffness: 280, damping: 30 } as const;
/** Snappier spring for small controls (menus, play buttons). */
export const SPRING_SNAPPY = { type: "spring", mass: 0.8, stiffness: 350, damping: 28 } as const;

export const DUR = { fast: 0.18, base: 0.35, slow: 0.6, slower: 0.9 } as const;

/** Fade-up reveal used by every scroll section. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: DUR.slow, ease: EASE_OUT, delay },
  }),
};

/** Parent that staggers children onto the stage. */
export const staggerParent: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.08 } },
};

export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR.base, ease: EASE_OUT },
  },
};

/** Soft hover lift for cards/rows — scale only, no layout shift. */
export const hoverLift = {
  whileHover: { scale: 1.02, transition: { duration: DUR.fast, ease: EASE_OUT } },
  whileTap: { scale: 0.99, transition: { duration: DUR.fast, ease: EASE_OUT } },
};

/** Overlay (lightbox/menu) entrance. */
export const overlay: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DUR.base, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: DUR.fast, ease: EASE_OUT } },
};

/** Dialog panel entrance — scale + fade, transform-only. */
export const panel: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 12 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { ...SPRING_CALM, duration: DUR.base } },
  exit: { opacity: 0, scale: 0.97, transition: { duration: DUR.fast, ease: EASE_OUT } },
};
