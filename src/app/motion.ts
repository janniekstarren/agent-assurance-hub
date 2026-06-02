/**
 * Motion presets — Framer Motion variants tuned to Fluent-like durations and
 * easings. Page transitions, list stagger, drawer springs and chart draw-on all
 * pull from here so motion stays consistent and restrained. Reduced motion is
 * honoured globally via <MotionConfig reducedMotion="user"> in the layout.
 */

import type { Transition, Variants } from 'framer-motion';

export const EASE_DECEL: [number, number, number, number] = [0.1, 0.9, 0.2, 1];
export const EASE_STANDARD: [number, number, number, number] = [0.33, 0, 0.2, 1];

export const durations = {
  fast: 0.15,
  normal: 0.25,
  gentle: 0.4,
  slow: 0.6,
};

export const springDrawer: Transition = {
  type: 'spring',
  stiffness: 320,
  damping: 34,
  mass: 0.9,
};

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.gentle, ease: EASE_DECEL },
  },
  exit: { opacity: 0, y: -6, transition: { duration: durations.fast } },
};

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.03, delayChildren: 0.02 },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.normal, ease: EASE_DECEL },
  },
};

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: durations.gentle } },
};
