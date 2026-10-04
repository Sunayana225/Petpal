/**
 * Input normalisation for pet and food names.
 *
 * The data layer stores pets under plural, lowercase keys (`dogs`, `cats`) but
 * the public API, the README and callers in general say `dog`, `DOG`, `Dog`.
 * Before this module existed every one of those lookups silently missed the
 * local veterinary database and fell through to the paid Gemini fallback.
 *
 * Everything here is pure and synchronous so it can be used by the repository,
 * the service and route validation alike.
 */

import type { SafetyCategory } from '../domain/foodSafety';

/**
 * Canonical pet keys — the single source of truth for "which species does
 * PetPal support". Used by the repository, `/api/info` and the docs.
 */
export const SUPPORTED_PET_KEYS = [
  'dogs',
  'cats',
  'rabbits',
  'hamsters',
  'birds',
  'turtles',
  'fish',
  'lizards',
  'snakes',
  'chickens',
] as const;

export type PetKey = (typeof SUPPORTED_PET_KEYS)[number];

/** Aliases accepted from callers, mapped onto their canonical plural key. */
const PET_ALIASES: Record<string, PetKey> = {
  // dogs
  dog: 'dogs', dogs: 'dogs', puppy: 'dogs', puppies: 'dogs', pup: 'dogs',
  // cats
  cat: 'cats', cats: 'cats', kitten: 'cats', kittens: 'cats', kitty: 'cats',
  // rabbits
  rabbit: 'rabbits', rabbits: 'rabbits', bunny: 'rabbits', bunnies: 'rabbits',
  // hamsters
  hamster: 'hamsters', hamsters: 'hamsters',
  // birds
  bird: 'birds', birds: 'birds', parrot: 'birds', parrots: 'birds',
  // turtles
  turtle: 'turtles', turtles: 'turtles', tortoise: 'turtles', tortoises: 'turtles',
  // fish
  fish: 'fish', fishes: 'fish',
  // lizards
  lizard: 'lizards', lizards: 'lizards', gecko: 'lizards', geckos: 'lizards',
  // snakes
  snake: 'snakes', snakes: 'snakes',
  // chickens
  chicken: 'chickens', chickens: 'chickens', hen: 'chickens', hens: 'chickens',
  rooster: 'chickens', chick: 'chickens', chicks: 'chickens',
};

/**
 * Normalise a caller-supplied pet name to its canonical key.
 * Returns `null` for anything PetPal has no data for (e.g. `dragon`).
 */
export function normalizePetKey(pet: string): PetKey | null {
  if (typeof pet !== 'string') return null;
  const key = pet.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!key) return null;
  return PET_ALIASES[key] ?? null;
}

/**
 * Normalise a food name: lowercase, trim, drop possessives, collapse
 * punctuation and whitespace so `"  Bell-Peppers!! "` becomes `"bell peppers"`.
 */
export function normalizeFoodKey(food: string): string {
  if (typeof food !== 'string') return '';
  let value = food.trim().toLowerCase();
  // Drop apostrophes outright so "apple's" -> "apples" rather than "apple s".
  value = value.replace(/['’]/g, '');
  // Anything else that isn't a letter or digit becomes a single space.
  value = value.replace(/[^\p{L}\p{N}]+/gu, ' ');
  return value.replace(/\s+/g, ' ').trim();
}

/**
 * A best-effort label for a pet we have no canonical key for (e.g. `tiger`),
 * used to key the AI answer cache and to prompt the model. Returns `''` when
 * there is nothing usable.
 */
export function normalizePetLabel(pet: string): string {
  if (typeof pet !== 'string') return '';
  return pet.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Food names that end in "s" but are already singular. Without this list
 * `singularize('grass')` would happily produce `'gras'`.
 */
const SINGULAR_S_WORDS = new Set([
  'grass', 'asparagus', 'molasses', 'sausage', 'lettuce', 'couscous', 'spinach',
]);

/** Naive English singulariser — good enough for a food-name lookup table. */
export function singularize(word: string): string {
  if (!word) return word;
  if (SINGULAR_S_WORDS.has(word)) return word;
  if (word.endsWith('ies') && word.length > 3) return `${word.slice(0, -3)}y`;
  if (word.endsWith('ss') || word.endsWith('us') || word.endsWith('is')) return word;
  if (word.endsWith('s') && word.length > 1) return word.slice(0, -1);
  return word;
}

/** Naive English pluraliser, the inverse of {@link singularize}. */
export function pluralize(word: string): string {
  if (!word) return word;
  if (word.endsWith('s')) return word;
  if (word.endsWith('y') && !/[aeiou]y$/.test(word)) return `${word.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/.test(word)) return `${word}es`;
  return `${word}s`;
}

/**
 * All spelling variants worth trying when looking a food up: the normalised
 * form plus its singular and plural shapes, so `apple` finds `apples` and
 * `grape` finds `grapes`. Ordered most-specific first; duplicates removed.
 */
export function foodVariants(raw: string): string[] {
  const base = normalizeFoodKey(raw);
  if (!base) return [];

  const tokens = base.split(' ');
  const singular = tokens.map(singularize).join(' ');
  const plural = tokens.map(pluralize).join(' ');

  return [...new Set([base, singular, plural])];
}

/**
 * Safety labels ranked by severity so merged records can keep the more
 * cautious verdict when two data sources disagree (e.g. ManyPets says
 * `caution` for avocado while the curated list says `unsafe`).
 */
export const SAFETY_RANK: Record<SafetyCategory, number> = {
  unsafe: 3,
  caution: 2,
  safe: 1,
};
