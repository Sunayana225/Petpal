import { manyPetsFoodSafetyData } from '../data/manyPetsFoodSafetyData';
import type { FoodItem, SafetyCategory } from '../types/foodSafety';
import { findDataFile, readJsonFile } from '../utils/dataFiles';
import { logger } from '../utils/logger';
import {
  SAFETY_RANK,
  foodVariants,
  normalizeFoodKey,
  normalizePetKey,
  SUPPORTED_PET_KEYS,
  type PetKey,
} from '../utils/normalization';

/** A food record after it has been normalised and filed under a pet key. */
export interface IndexedFood extends FoodItem {
  pet: PetKey;
  safety: SafetyCategory;
}

type LegacyDatabase = Record<string, Partial<Record<SafetyCategory, FoodItem[]>> | undefined>;

interface ManyPetsCategoryMap {
  safe?: FoodItem[];
  unsafe?: FoodItem[];
  caution?: FoodItem[];
}

const CATEGORIES: SafetyCategory[] = ['unsafe', 'caution', 'safe'];

function loadLegacyDatabase(): LegacyDatabase {
  const databasePath = findDataFile('foodSafety.json');
  if (!databasePath) {
    logger.warn('data/foodSafety.json not found — falling back to ManyPets data only');
    return {};
  }

  return readJsonFile<LegacyDatabase>(databasePath, {});
}

/**
 * A single, merged index over every veterinary data source PetPal ships with.
 *
 * Before this class existed the two data sets were read by two different code
 * paths: `checkFoodSafety()` searched `manyPetsFoodSafetyData` and then the
 * legacy JSON, while `/pets`, `/safe/:pet` and `/unsafe/:pet` read *only* the
 * JSON. The list endpoints and the check endpoint could therefore disagree
 * about which foods were even known to the system.
 *
 * Everything now flows through `index`, so a food is found by `search()` if and
 * only if it appears in the lists returned by `getSafeFoods()` and friends.
 */
export class FoodSafetyRepository {
  /** pet key -> (normalised food key -> record) */
  private readonly index = new Map<PetKey, Map<string, IndexedFood>>();

  /** every spelling variant -> pet key -> record, for fast lookups */
  private readonly lookup = new Map<string, Map<PetKey, IndexedFood>>();

  constructor() {
    this.rebuild();
  }

  /** Re-read both data sources and rebuild every in-memory index. */
  rebuild(): void {
    this.index.clear();
    for (const pet of SUPPORTED_PET_KEYS) {
      this.index.set(pet, new Map());
    }

    // 1. Curated JSON — covers every species and carries the richest detail
    //    (symptoms, severity, alternatives), so it is loaded first and wins ties.
    const legacy = loadLegacyDatabase();
    for (const [pet, categories] of Object.entries(legacy)) {
      if (!categories) continue;
      const petKey = normalizePetKey(pet);
      if (!petKey) continue;
      this.ingestCategories(petKey, categories, 'Veterinary database');
    }

    // 2. ManyPets — the authoritative safety labels for dogs and cats. Its
    //    generated object also carries a `metadata` key, which the `'safe' in`
    //    guard below skips.
    const manyPets = manyPetsFoodSafetyData as unknown as Record<string, ManyPetsCategoryMap>;
    for (const [pet, categories] of Object.entries(manyPets)) {
      if (!categories || typeof categories !== 'object') continue;
      if (!('safe' in categories)) continue;
      const petKey = normalizePetKey(pet);
      if (!petKey) continue;
      this.ingestCategories(petKey, categories, 'ManyPets');
    }

    this.rebuildLookup();
  }

  /**
   * Find a food for a pet. Accepts singular or plural pet names and any
   * reasonable spelling variant of the food name.
   */
  search(food: string, pet: string): IndexedFood | null {
    const petKey = normalizePetKey(pet);
    if (!petKey) return null;

    for (const variant of foodVariants(food)) {
      const hit = this.lookup.get(variant)?.get(petKey);
      if (hit) return hit;
    }
    return null;
  }

  /** All records for a pet, optionally narrowed to one safety category. */
  getFoods(pet: string, safety?: SafetyCategory): IndexedFood[] {
    const petKey = normalizePetKey(pet);
    if (!petKey) return [];
    const bucket = this.index.get(petKey);
    if (!bucket) return [];

    const records = [...bucket.values()];
    return safety ? records.filter((record) => record.safety === safety) : records;
  }

  getSafeFoods(pet: string): IndexedFood[] {
    return this.getFoods(pet, 'safe');
  }

  getCautionFoods(pet: string): IndexedFood[] {
    return this.getFoods(pet, 'caution');
  }

  getUnsafeFoods(pet: string): IndexedFood[] {
    return this.getFoods(pet, 'unsafe');
  }

  /**
   * Species we can actually answer for — i.e. those with at least one record.
   * Ordered by {@link SUPPORTED_PET_KEYS} so responses stay stable.
   */
  getSupportedPets(): PetKey[] {
    return SUPPORTED_PET_KEYS.filter((pet) => (this.index.get(pet)?.size ?? 0) > 0);
  }

  isSupportedPet(pet: string): boolean {
    return normalizePetKey(pet) !== null;
  }

  /** Record counts per species and category — powers `/api/food-safety/stats`. */
  getStats(): Record<string, Record<SafetyCategory | 'total', number>> {
    const stats: Record<string, Record<SafetyCategory | 'total', number>> = {};

    for (const [pet, bucket] of this.index) {
      const counts: Record<SafetyCategory | 'total', number> = {
        safe: 0,
        caution: 0,
        unsafe: 0,
        total: 0,
      };
      for (const record of bucket.values()) {
        counts[record.safety]++;
        counts.total++;
      }
      stats[pet] = counts;
    }

    return stats;
  }

  /** Total indexed food records across every species. */
  get totalEntries(): number {
    let total = 0;
    for (const bucket of this.index.values()) total += bucket.size;
    return total;
  }

  private ingestCategories(
    pet: PetKey,
    categories: Partial<Record<SafetyCategory, FoodItem[]>>,
    defaultSource: string,
  ): void {
    for (const category of CATEGORIES) {
      const items = categories[category];
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        this.insert(pet, category, item, defaultSource);
      }
    }
  }

  /**
   * Insert one record, merging it with any record already held for the same
   * pet + food. When two sources disagree the more cautious verdict wins, but
   * whichever record carries more detail donates its missing fields — so we keep
   * ManyPets' authoritative `unsafe` label *and* the curated list's symptoms.
   */
  private insert(
    pet: PetKey,
    safety: SafetyCategory,
    item: FoodItem,
    defaultSource: string,
  ): void {
    const bucket = this.index.get(pet);
    if (!bucket) return;
    if (!item || typeof item.food !== 'string') return;

    const foodKey = normalizeFoodKey(item.food);
    if (!foodKey) return;

    const incoming: IndexedFood = {
      ...item,
      food: item.food.trim(),
      safety,
      pet,
      source: item.source ?? defaultSource,
    };

    const existing = bucket.get(foodKey);
    if (!existing) {
      bucket.set(foodKey, incoming);
      return;
    }

    const merged =
      SAFETY_RANK[safety] > SAFETY_RANK[existing.safety]
        ? { ...existing, ...incoming } // incoming verdict wins, inherits extra detail
        : { ...incoming, ...existing }; // existing verdict wins, inherits extra detail

    bucket.set(foodKey, merged);
  }

  private rebuildLookup(): void {
    this.lookup.clear();

    for (const [pet, bucket] of this.index) {
      for (const [foodKey, record] of bucket) {
        for (const variant of foodVariants(foodKey)) {
          let byPet = this.lookup.get(variant);
          if (!byPet) {
            byPet = new Map();
            this.lookup.set(variant, byPet);
          }
          const existing = byPet.get(pet);
          if (!existing || SAFETY_RANK[record.safety] > SAFETY_RANK[existing.safety]) {
            byPet.set(pet, record);
          }
        }
      }
    }
  }
}

/** Process-wide repository — both data sources are static at runtime. */
export const foodSafetyRepository = new FoodSafetyRepository();
