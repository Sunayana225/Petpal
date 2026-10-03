import type { Transition, Variants } from 'framer-motion';

/**
 * Motion tokens for the PetPal design system.
 *
 * The references (Aesop, Saint Laurent) move slowly and settle — nothing
 * bounces. So the easing is a long deceleration and spring physics are avoided
 * in favour of explicit durations.
 */

/** Decelerating ease used for almost every entrance. */
export const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Symmetric ease for exits and cross-fades. */
export const EASE_IN_OUT: [number, number, number, number] = [0.65, 0, 0.35, 1];

export const DURATION = {
  fast: 0.4,
  base: 0.7,
  slow: 1.1,
  reveal: 0.9,
} as const;

export function transition(duration: number = DURATION.base, delay = 0): Transition {
  return { duration, delay, ease: EASE };
}

/** Opacity + a short lift. The workhorse entrance. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: transition(DURATION.reveal) },
};

/** Parent that cascades its children in. */
export function staggerParent(stagger = 0.08, delayChildren = 0): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren } },
  };
}
