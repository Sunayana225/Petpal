import type { FoodItem, FoodSafetyResult, SafetyLevel } from '../domain/foodSafety';
import { TTL, TtlCache } from '../utils/cache';
import { logger, type Logger } from '../utils/logger';
import { normalizeFoodKey, normalizePetKey, normalizePetLabel } from '../utils/normalization';
import { answerCache, type AnswerStore } from './answerCache';
import { type AnswerSource, defaultAnswerSources } from './answerSources';
import { FoodSafetyRepository, foodSafetyRepository, type IndexedFood } from '../repositories/foodSafetyRepository';

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
    private readonly durable: AnswerStore | undefined = answerCache,
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
  async checkFoodSafety(
    pet: string,
    food: string,
    options: { apiKey?: string; requestId?: string; signal?: AbortSignal } = {},
  ): Promise<FoodSafetyResult> {
    const startedAt = Date.now();
    const log = logger.child({ requestId: options.requestId ?? null, pet, food });

    const petKey = normalizePetKey(pet);
    // A species we don't curate (e.g. "tiger") still gets a label, so it can be
    // answered by the remote sources instead of being refused outright.
    const petLabel = petKey ?? normalizePetLabel(pet);
    const foodKey = normalizeFoodKey(food);

    // 1. Local veterinary database — instant, free, and the most trustworthy
    //    answer we have. Curated species only.
    if (petKey) {
      const record = this.repository.search(food, petKey);
      if (record) {
        log.debug('resolved from database', { safety: record.safety, ms: Date.now() - startedAt });
        return this.fromDatabase(record, pet, food);
      }
    }

    // 2. Need a food and something to look it up for. Only a genuinely empty
    //    input stops here — an unknown *species* now falls through to AI.
    if (!foodKey || !petLabel) {
      const reason = !foodKey ? 'no food name was provided' : `the pet type "${pet}" was not readable`;
      log.warn('cannot resolve: incomplete input', {
        hasFood: Boolean(foodKey),
        hasPet: Boolean(petLabel),
      });
      return {
        pet,
        food,
        safety: 'unknown',
        message: `❓ We couldn't check that: ${reason}. Please consult your veterinarian to be safe.`,
        source: 'none',
      };
    }

    if (!petKey) {
      log.info('unsupported species — falling through to the AI sources', { petLabel });
    }

    // 3a. BYOK: the caller is spending their own quota, so never let a cached
    //     guess (or the in-process cache) block a fresh answer. Only a
    //     human-approved answer may short-circuit it.
    if (options.apiKey) {
      const approved = this.durable?.getApproved(petLabel, foodKey);
      if (approved) {
        log.debug('serving approved answer (bypassing live call)');
        return { ...approved, pet, food };
      }
      const fresh = await this.resolveRemotely(petLabel, pet, food, options.apiKey, log, options.signal);
      return { ...fresh, pet, food };
    }

    // 3b. Remote resolution, memoised in-process *and* durably. The durable cache
    //     is checked first, so a food resolved before — even in a previous process
    //     — never reaches Gemini again.
    const cacheKey = `${petLabel}|${foodKey}`;
    const { value, fromCache } = await this.answerCache.getOrSet(
      cacheKey,
      (result) => (result.safety === 'unknown' ? TTL.unknown : TTL.ai),
      () => {
        const stored = this.durable?.getServable(petLabel, foodKey);
        if (stored) {
          log.debug('durable cache hit');
          return Promise.resolve(stored);
        }
        return this.resolveRemotely(petLabel, pet, food, options.apiKey, log);
      },
    );

    log.info('resolved', {
      source: value.source,
      safety: value.safety,
      cached: fromCache,
      ms: Date.now() - startedAt,
    });
    return { ...value, pet, food };
  }

  /**
   * Walk the injected answer sources in order and take the first verdict. A
   * source that throws or declines (`null`) must never fail the request, so the
   * chain degrades to an honest `unknown`.
   */
  private async resolveRemotely(
    petLabel: string,
    pet: string,
    food: string,
    apiKey: string | undefined,
    log: Logger,
    signal?: AbortSignal,
  ): Promise<FoodSafetyResult> {
    const budget = AbortSignal.any([AbortSignal.timeout(35000), ...(signal ? [signal] : [])]);
    for (const source of this.sources) {
      if (budget.aborted) break;
      const sourceStartedAt = Date.now();
      try {
        const result = await source.resolve(petLabel, pet, food, apiKey, budget);
        if (result) {
          log.info('remote source answered', {
            source: source.source,
            safety: result.safety,
            byok: Boolean(apiKey),
            ms: Date.now() - sourceStartedAt,
          });
          this.persist(petLabel, result, apiKey, log);
          return result;
        }
        log.debug('remote source declined', {
          source: source.source,
          ms: Date.now() - sourceStartedAt,
        });
      } catch (error) {
        log.error('remote source failed', { source: source.source, error });
      }
    }

    log.warn('no remote source could answer', { byok: Boolean(apiKey) });
    const fallback: FoodSafetyResult = {
      pet,
      food,
      safety: 'unknown',
      message: buildMessage('unknown', food, pet),
      source: 'none',
    };
    // Remember the dead end too — re-asking the sources won't change the answer.
    this.persist(petLabel, fallback, apiKey, log);
    return fallback;
  }

  /**
   * Remember a remote answer so the same question never spends a second call.
   * A user-supplied key that failed (yielding `unknown`) is deliberately *not*
   * written, so a bad BYOK key cannot poison the shared cache for everyone.
   */
  private persist(
    petLabel: string,
    result: FoodSafetyResult,
    apiKey: string | undefined,
    log: Logger,
  ): void {
    if (apiKey && result.safety === 'unknown') {
      log.debug('not caching: BYOK key produced no verdict');
      return;
    }
    this.durable?.recordAnswer(petLabel, result);
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
