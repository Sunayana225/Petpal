import type { FoodSafetyResult } from '../domain/types';
import { request } from './client';

/**
 * The public food-safety endpoints: the headline check, and validating a
 * visitor's own Gemini key.
 */
export const foodSafetyApi = {
  checkFoodSafety(pet: string, food: string): Promise<FoodSafetyResult> {
    return request<FoodSafetyResult>(
      `/food-safety/check?pet=${encodeURIComponent(pet)}&food=${encodeURIComponent(food)}`,
    );
  },

  /** Validate a user-supplied Gemini key against Google (read-only). */
  validateGeminiKey(apiKey: string): Promise<{ valid: boolean }> {
    return request<{ valid: boolean }>('/gemini/validate', {
      method: 'POST',
      body: JSON.stringify({ apiKey }),
    });
  },
};
