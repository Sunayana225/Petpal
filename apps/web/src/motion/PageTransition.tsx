import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

import { DURATION, EASE } from './tokens';

/**
 * Cross-fade between routes. Deliberately short and quiet — a luxury site
 * changes pages without drawing attention to the mechanism.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
      transition={{ duration: DURATION.fast, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
