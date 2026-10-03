import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

import { DURATION, EASE, fadeUp, staggerParent } from './tokens';

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Distance to lift from, in px. */
  y?: number;
  once?: boolean;
}

/**
 * Fade-and-lift an element into view as it scrolls in. Honours reduced motion
 * by dropping the transform and keeping only the fade.
 */
export function Reveal({ children, className, delay = 0, y = 20, once = true }: RevealProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once, margin: '-10% 0px -10% 0px' }}
      transition={{ duration: DURATION.reveal, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

interface StaggerProps {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delayChildren?: number;
}

/** Container whose {@link StaggerItem} children animate in sequence. */
export function Stagger({
  children,
  className,
  stagger = 0.08,
  delayChildren = 0,
}: StaggerProps) {
  return (
    <motion.div
      className={className}
      variants={staggerParent(stagger, delayChildren)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-10% 0px -10% 0px' }}
    >
      {children}
    </motion.div>
  );
}

/** A single child of {@link Stagger}. */
export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={fadeUp}>
      {children}
    </motion.div>
  );
}
