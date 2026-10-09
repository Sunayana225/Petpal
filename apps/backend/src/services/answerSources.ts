import type { FoodSafetyResult } from '../domain/foodSafety';
import { AIService } from './aiService';
import { ExternalApiService } from './externalApiService';
import { ConcurrencyGate } from '../utils/concurrency';
import { env } from '../config/env';
const aiGate = new ConcurrencyGate(env.aiConcurrency);

/**
 * A single place a verdict can come from when the local database has no answer.
 *
 * The service depends on this abstraction, not on the concrete AI or
 * Open Pet Food Facts implementations (dependency inversion). Adding, removing
 * or reordering a source is a change here — never a change in the service.
 */
export interface AnswerSource {
  /** Provenance label written onto the result, e.g. `external` or `ai`. */
  readonly source: 'external' | 'ai';
  /**
   * Try to answer `food` for `pet`. Return `null` to defer to the next source.
   * Implementations may throw on failure; the caller treats that as `null`.
   *
   * `apiKey` is an optional caller-supplied (BYOK) credential used for this
   * call only.
   */
  resolve(
    petLabel: string,
    pet: string,
    food: string,
    apiKey?: string,
    signal?: AbortSignal,
  ): Promise<FoodSafetyResult | null>;
}

/**
 * Commercial-product lookup against the free Open Pet Food Facts database.
 * Forwards to {@link ExternalApiService}; returns `null` when nothing relevant
 * is found or when the upstream is unreachable.
 */
export class OpenPetFoodFactsSource implements AnswerSource {
  readonly source = 'external' as const;

  async resolve(petLabel: string, pet: string, food: string, _apiKey?: string, signal?: AbortSignal): Promise<FoodSafetyResult | null> {
    const external = await ExternalApiService.searchAllSources(food, petLabel, signal);
    if (!external) return null;

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
}

/**
 * Gemini fallback. Always returns a result (it degrades to `unknown` internally
 * when unconfigured), so it belongs last in the chain.
 */
export class AiAnswerSource implements AnswerSource {
  readonly source = 'ai' as const;

  async resolve(
    petLabel: string,
    pet: string,
    food: string,
    apiKey?: string,
    signal?: AbortSignal,
  ): Promise<FoodSafetyResult | null> {
    const ai = await aiGate.run(() => AIService.getFoodSafetyAdvice(food, petLabel, apiKey, signal), signal);

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
      assessmentVersion: 'structured-v1',
    };
  }
}

/**
 * The default chain, cheapest and most trustworthy first: a free external
 * database, then the paid AI. Reorder or replace by passing your own array to
 * {@link FoodSafetyService}.
 */
export const defaultAnswerSources = (): AnswerSource[] => [
  new OpenPetFoodFactsSource(),
  new AiAnswerSource(),
];
