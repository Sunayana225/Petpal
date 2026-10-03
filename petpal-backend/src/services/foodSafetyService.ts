import { AIService } from './aiService';
import { ExternalApiService } from './externalApiService';
import { FoodSafetyRepository, foodSafetyRepository, type IndexedFood } from './foodSafetyRepository';
import type { FoodItem, FoodSafetyResult, SafetyLevel } from '../types/foodSafety';
import { normalizeFoodKey, normalizePetKey, type PetKey } from '../utils/normalization';
import { TTL, TtlCache } from '../utils/cache';

// Re-exported so existing importers keep working.
export type { FoodItem, FoodSafetyResult };

/**
 * Compose the owner-facing verdict line. Phrased for a worried pet owner
 * rather than a developer — this string is what people actually read.
 *
 * Note the `NOT SAFE` wording: it is asserted by the test suite and has become
 * part of the API's observable contract, so treat it as load-bearing.
 */
function buildMessage(
  safety: SafetyLevel,
  food: string,
  pet: string,
  sourceLabel?: string,
): string {
  const basis = sourceLabel ? ` according to ${sourceLabel}` : '';

  switch (safety) {
    case 'safe':
      return `✅ ${food} is SAFE for ${pet}${basis}!`;
    case 'unsafe':
      return `❌ ${food} is NOT SAFE for ${pet}${basis}!`;
    case 'caution':
      return `⚠️ ${food} should be given with CAUTION to ${pet}${basis}!`;
    default:
      return `❓ We don't have specific information about ${food} for ${pet}. Please consult your veterinarian to be safe.`;
  }
}

/**
 * Resolve a food PetPal has no local record for: try the free Open Pet Food
 * Facts barcode/product database first, then fall back to Gemini.
 *
 * Both remote calls are allowed to fail independently — a dead upstream must
 * degrade to an `unknown` verdict, never to a 500.
 */
async function resolveRemotely(
  petKey: PetKey,
  pet: string,
  food: string,
): Promise<FoodSafetyResult> {
  try {
    const external = await ExternalApiService.searchAllSources(food, petKey);
    if (external) {
      return {
        pet,
        food,
        safety: external.safety,
        message: `${external.message} (Open Pet Food Facts)`,
        details: {
          food,
          safety: external.safety,
          description: external.details.description,
          source: external.details.source,
          brand: external.details.brand,
          product_name: external.details.product_name,
          barcode: external.details.barcode,
          image_url: external.details.image_url,
          ingredients: external.details.ingredients,
          recommendation: external.details.recommendation,
        },
        source: 'external',
      };
    }
  } catch (error) {
    console.error('[FoodSafetyService] External lookup failed:', error);
  }

  try {
    const ai = await AIService.getFoodSafetyAdvice(food, petKey);
    return {
      pet,
      food,
      safety: ai.safety,
      message: ai.message,
      details: {
        food: ai.food,
        safety: ai.safety,
        description: ai.details.description,
        symptoms: ai.details.symptoms,
        benefits: ai.details.benefits,
        alternatives: ai.details.alternatives,
        preparation: ai.details.preparation,
        recommendation: ai.details.recommendation,
        severity: ai.details.severity,
      },
      source: 'ai',
    };
  } catch (error) {
    console.error('[FoodSafetyService] AI lookup failed:', error);
    return {
      pet,
      food,
      safety: 'unknown',
      message: buildMessage('unknown', food, pet),
      source: 'none',
    };
  }
}

/**
 * Front door for food-safety questions.
 *
 * Resolution order, cheapest and most trustworthy first:
 *
 *  1. the merged in-memory veterinary database (instant, free);
 *  2. Open Pet Food Facts (free, remote);
 *  3. Gemini (paid, remote);
 *  4. an honest `unknown`.
 *
 * Steps 2–4 are memoised with in-flight coalescing so N concurrent users
 * asking the same question cost exactly one upstream round trip.
 */
export class FoodSafetyService {
  private readonly answerCache = new TtlCache<FoodSafetyResult>(500);

  constructor(private readonly repository: FoodSafetyRepository = foodSafetyRepository) {}

  getSupportedPets(): string[] {
    return this.repository.getSupportedPets();
  }

  getSafeFoods(pet: string): FoodItem[] {
    return this.repository.getSafeFoods(pet);
  }

  getCautionFoods(pet: string): FoodItem[] {
    return this.repository.getCautionFoods(pet);
  }

  getUnsafeFoods(pet: string): FoodItem[] {
    return this.repository.getUnsafeFoods(pet);
  }

  /** Exposed for diagnostics and tests. */
  get cache(): TtlCache<FoodSafetyResult> {
    return this.answerCache;
  }

  /**
   * Check whether a food is safe for a pet.
   *
   * The original `pet` and `food` arguments are echoed back untouched — callers
   * rely on that (the test suite asserts `'DOG'` stays `'DOG'`) — while every
   * lookup internally works on normalised keys.
   */
  async checkFoodSafety(pet: string, food: string): Promise<FoodSafetyResult> {
    const petKey = normalizePetKey(pet);
    const foodKey = normalizeFoodKey(food);

    // 1. Local veterinary database — instant, free, and the most trustworthy
    //    answer we have. This is the path that singular/plural mismatches used
    //    to skip entirely.
    if (petKey) {
      const record = this.repository.search(food, petKey);
      if (record) return this.fromDatabase(record, pet, food);
    }

    // 2. Nothing to look up with — and deliberately *before* any remote call, so
    //    a typo like "dragon" or an empty string never spends a Gemini credit.
    if (!petKey || !foodKey) {
      const reason = !petKey
        ? `we don't have data for the pet type "${pet}"`
        : `no food name was provided`;
      return {
        pet,
        food,
        safety: 'unknown',
        message: `❓ We couldn't check that: ${reason}. Please consult your veterinarian to be safe.`,
        source: 'none',
      };
    }

    // 3. Remote resolution, memoised. Definitive verdicts stick around longer
    //    than guesses so we don't re-burn credits on the same question.
    const cacheKey = `${petKey}|${foodKey}`;
    const { value } = await this.answerCache.getOrSet(
      cacheKey,
      (result) => (result.safety === 'unknown' ? TTL.unknown : TTL.ai),
      () => resolveRemotely(petKey, pet, food),
    );

    return { ...value, pet, food };
  }

  private fromDatabase(record: IndexedFood, pet: string, food: string): FoodSafetyResult {
    return {
      pet,
      food,
      safety: record.safety,
      message: buildMessage(record.safety, food, pet, record.source),
      details: record,
      source: 'database',
    };
  }

  /**
   * Type-ahead search across the local database. Pass `pet` to narrow the
   * search to one species; omit it to sweep every species PetPal knows about.
   * Each result carries its `pet` key, so callers can group them.
   */
  search(query: string, pet?: string): IndexedFood[] {
    const petKey = pet ? normalizePetKey(pet) : null;
    if (pet && !petKey) return [];

    const pets: string[] = petKey ? [petKey] : this.repository.getSupportedPets();

    const results: IndexedFood[] = [];
    for (const candidate of pets) {
      const hit = this.repository.search(query, candidate);
      if (hit) results.push(hit);
    }
    return results;
  }

  /** Per-species record counts — backs `/api/food-safety/stats`. */
  getStats(): Record<string, Record<string, number>> {
    return this.repository.getStats();
  }

  /** Total indexed food records across every species. */
  get totalEntries(): number {
    return this.repository.totalEntries;
  }
}
