import type { FoodSafetyResult } from '../domain/types';
import { buildQuery, requestJson } from './client';

/**
 * The public food-safety endpoints: the headline check, and validating a
 * visitor's own Gemini key.
 */
export const foodSafetyApi = {
  /** The headline check — GET so results are linkable and cacheable. */
  checkFoodSafety(
    pet: string,
    food: string,
    geminiKey?: string | null,
  ): Promise<FoodSafetyResult> {
    return requestJson<FoodSafetyResult>(
      `/food-safety/check${buildQuery({ pet, food })}`,
      geminiKey ? { headers: { 'X-Gemini-Key': geminiKey } } : {},
    );
  },

  /** Validate a user-supplied Gemini key (cheap, read-only Google call). */
  validateGeminiKey(apiKey: string): Promise<{ valid: boolean }> {
    return requestJson<{ valid: boolean }>('/gemini/validate', {
      method: 'POST',
      body: JSON.stringify({ apiKey }),
    });
  },
};
