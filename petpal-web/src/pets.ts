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

/**
 * One token per verdict. Shapes and colour are intentionally austere: a thin
 * rule and a word, no fills or pastel chips.
 */
export const SAFETY_META: Record<
  SafetyLevel,
  { label: string; gloss: string; text: string; border: string; rule: string }
> = {
  safe: {
    label: 'Safe',
    gloss: 'Generally fine in normal amounts.',
    text: 'text-safe',
    border: 'border-safe',
    rule: 'bg-safe',
  },
  caution: {
    label: 'Caution',
    gloss: 'Moderation only — check with your vet.',
    text: 'text-caution',
    border: 'border-caution',
    rule: 'bg-caution',
  },
  unsafe: {
    label: 'Unsafe',
    gloss: 'Do not feed. Contact a vet if consumed.',
    text: 'text-unsafe',
    border: 'border-unsafe',
    rule: 'bg-unsafe',
  },
  unknown: {
    label: 'Unknown',
    gloss: 'We have no data — consult a veterinarian.',
    text: 'text-unknown',
    border: 'border-unknown',
    rule: 'bg-unknown',
  },
};

export const CATEGORY_META: Record<FoodCategory, { label: string; gloss: string }> = {
  safe: { label: 'Safe', gloss: 'Generally fine in normal amounts.' },
  caution: { label: 'Caution', gloss: 'Moderation only.' },
  unsafe: { label: 'Unsafe', gloss: 'Do not feed.' },
};
