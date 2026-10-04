import { getGeminiKeySync } from './lib/geminiKey';
import type { CategoryListResponse, FoodCategory, FoodSafetyResult } from './types';

/**
 * API base URL.
 *
 * A physical device cannot reach your machine's `localhost`, so point
 * `EXPO_PUBLIC_API_URL` at a LAN address or the deployed host when testing on
 * hardware. The simulator/web fall back to the local dev server.
 */
const RAW_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api';
export const API_BASE_URL = RAW_BASE.replace(/\/+$/, '');

const DEFAULT_TIMEOUT_MS = 8000;

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers as Record<string, string> | undefined),
    };

    // Attach the visitor's own Gemini key, if they set one.
    const geminiKey = getGeminiKeySync();
    if (geminiKey) headers['x-gemini-key'] = geminiKey;

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers,
    });

    if (!response.ok) {
      let detail = `Request failed (${response.status})`;
      try {
        const body = (await response.json()) as { message?: string; error?: string };
        detail = body.message ?? body.error ?? detail;
      } catch {
        // Non-JSON error body.
      }
      throw new ApiError(detail, response.status);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Could not reach PetPal. Check your connection.', 0);
  } finally {
    clearTimeout(timer);
  }
}

function listCategory(category: FoodCategory, pet: string): Promise<CategoryListResponse> {
  return request<CategoryListResponse>(
    `/food-safety/${category}/${encodeURIComponent(pet)}`,
  );
}

export const api = {
  checkFoodSafety(pet: string, food: string): Promise<FoodSafetyResult> {
    return request<FoodSafetyResult>(
      `/food-safety/check?pet=${encodeURIComponent(pet)}&food=${encodeURIComponent(food)}`,
    );
  },
  getSafeFoods: (pet: string) => listCategory('safe', pet),
  getCautionFoods: (pet: string) => listCategory('caution', pet),
  getUnsafeFoods: (pet: string) => listCategory('unsafe', pet),

  /** Validate a user-supplied Gemini key against Google (read-only). */
  validateGeminiKey(apiKey: string): Promise<{ valid: boolean }> {
    return request<{ valid: boolean }>('/gemini/validate', {
      method: 'POST',
      body: JSON.stringify({ apiKey }),
    });
  },
};
