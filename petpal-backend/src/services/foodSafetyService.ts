import type { FoodItem, FoodSafetyResult, SafetyLevel } from '../types/foodSafety';
import { normalizeFoodKey, normalizePetKey, type PetKey } from '../utils/normalization';
import { TTL, TtlCache } from '../utils/cache';
import { aiLearningStore, type LearningSink } from './aiLearningStore';
import { type AnswerSource, defaultAnswerSources } from './answerSources';
import { FoodSafetyRepository, foodSafetyRepository, type IndexedFood } from './foodSafetyRepository';

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
 * Front door for food-safety questions.
 *
 * Resolution order, cheapest and most trustworthy first:
 *
 *  1. the merged in-memory veterinary database (instant, free);
 *  2. the injected {@link AnswerSource} chain (free external database, then
 *     the paid AI by default);
 *  3. an honest `unknown`.
 *
 * Step 2 is memoised with in-flight coalescing so N concurrent users asking the
 * same question cost exactly one upstream round trip.
 *
 * Dependencies are supplied through the constructor so the service can be
 * composed and tested without reaching for module-level singletons.
 */
export class FoodSafetyService {
  private readonly answerCache = new TtlCache<FoodSafetyResult>(500);

  constructor(
    private readonly repository: FoodSafetyRepository = foodSafetyRepository,
    private readonly sources: AnswerSource[] = defaultAnswerSources(),
    private readonly learning: LearningSink | undefined = aiLearningStore,
  ) {}

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
      () => this.resolveRemotely(petKey, pet, food),
    );

    return { ...value, pet, food };
  }

  /**
   * Walk the injected answer sources in order and take the first verdict. A
   * source that throws or declines (`null`) must never fail the request, so the
   * chain degrades to an honest `unknown`.
   */
  private async resolveRemotely(
    petKey: PetKey,
    pet: string,
    food: string,
  ): Promise<FoodSafetyResult> {
    for (const source of this.sources) {
      try {
        const result = await source.resolve(petKey, pet, food);
        if (result) {
          // AI answers are captured for human review — never trusted silently.
          if (source.source === 'ai' && result.safety !== 'unknown') {
            this.learning?.recordAnswer({
              pet: petKey,
              food: result.food,
              safety: result.safety,
              description: result.details?.description,
              symptoms: result.details?.symptoms,
              benefits: result.details?.benefits,
              alternatives: result.details?.alternatives,
              preparation: result.details?.preparation,
              recommendation: result.details?.recommendation,
              severity: result.details?.severity,
            });
          }
          return result;
        }
      } catch (error) {
        console.error(`[FoodSafetyService] ${source.source} lookup failed:`, error);
      }
    }

    return {
      pet,
      food,
      safety: 'unknown',
      message: buildMessage('unknown', food, pet),
      source: 'none',
    };
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
