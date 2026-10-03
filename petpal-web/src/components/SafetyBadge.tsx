import { SAFETY_META } from '../pets';
import type { SafetyLevel } from '../types';

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-2 text-lg',
} as const;

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
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${meta.classes} ${SIZE_CLASSES[size]}`}
    >
      <span aria-hidden="true">{meta.emoji}</span>
      {meta.label}
    </span>
  );
}
