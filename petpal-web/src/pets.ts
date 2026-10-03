import type { FoodCategory, SafetyLevel } from './types';

export interface PetMeta {
  /** Canonical API key, e.g. `dogs`. */
  key: string;
  /** Singular label used in copy, e.g. `Dog`. */
  label: string;
  emoji: string;
  blurb: string;
}

/**
 * Presentation metadata for each species the API supports. The keys must stay
 * in sync with `SUPPORTED_PET_KEYS` on the backend — `/api/food-safety/pets`
 * is the runtime source of truth and is used to filter this list.
 */
export const PETS: PetMeta[] = [
  { key: 'dogs', label: 'Dog', emoji: '🐕', blurb: 'Deepest data — 60+ foods' },
  { key: 'cats', label: 'Cat', emoji: '🐈', blurb: 'Obligate-carnivore aware' },
  { key: 'rabbits', label: 'Rabbit', emoji: '🐰', blurb: 'High-fibre gut needs' },
  { key: 'hamsters', label: 'Hamster', emoji: '🐹', blurb: 'Cheek-pouch sized bites' },
  { key: 'birds', label: 'Bird', emoji: '🐦', blurb: 'Sensitive respiratory systems' },
  { key: 'turtles', label: 'Turtle', emoji: '🐢', blurb: 'Shell & calcium balance' },
  { key: 'fish', label: 'Fish', emoji: '🐠', blurb: 'Water-quality dependent' },
  { key: 'lizards', label: 'Lizard', emoji: '🦎', blurb: 'Species-specific diets' },
  { key: 'snakes', label: 'Snake', emoji: '🐍', blurb: 'Strict carnivores' },
  { key: 'chickens', label: 'Chicken', emoji: '🐔', blurb: 'Backyard-flock friendly' },
];

export const PET_BY_KEY: Record<string, PetMeta> = Object.fromEntries(
  PETS.map((pet) => [pet.key, pet]),
);

export const SAFETY_META: Record<
  SafetyLevel,
  { label: string; emoji: string; classes: string; border: string }
> = {
  safe: {
    label: 'Safe',
    emoji: '✅',
    classes: 'bg-green-100 text-green-800 border-green-300',
    border: 'border-green-500',
  },
  caution: {
    label: 'Caution',
    emoji: '⚠️',
    classes: 'bg-amber-100 text-amber-800 border-amber-300',
    border: 'border-amber-500',
  },
  unsafe: {
    label: 'Unsafe',
    emoji: '❌',
    classes: 'bg-red-100 text-red-800 border-red-300',
    border: 'border-red-500',
  },
  unknown: {
    label: 'Unknown',
    emoji: '❓',
    classes: 'bg-slate-100 text-slate-700 border-slate-300',
    border: 'border-slate-400',
  },
};

export const CATEGORY_META: Record<FoodCategory, { label: string; emoji: string }> = {
  safe: { label: 'Safe', emoji: '✅' },
  caution: { label: 'Caution', emoji: '⚠️' },
  unsafe: { label: 'Unsafe', emoji: '❌' },
};
