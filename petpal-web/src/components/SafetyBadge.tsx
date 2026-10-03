import { SAFETY_META } from '../pets';
import type { SafetyLevel } from '../types';

const SIZE_CLASSES = {
  sm: 'px-2.5 py-0.5 text-[10px]',
  md: 'px-3 py-1 text-[11px]',
  lg: 'px-4 py-1.5 text-xs',
} as const;

/**
 * A verdict tag: a word, a hairline border, no fill. Deliberately not a pill —
 * the whole system uses square corners.
 */
export default function SafetyBadge({
  safety,
  size = 'md',
}: {
  safety: SafetyLevel;
  size?: keyof typeof SIZE_CLASSES;
}) {
  const meta = SAFETY_META[safety];

  return (
    <span
      className={`inline-flex items-center border font-medium uppercase tracking-wide-cap ${meta.text} ${meta.border} ${SIZE_CLASSES[size]}`}
    >
      {meta.label}
    </span>
  );
}
