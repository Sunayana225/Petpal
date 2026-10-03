import type {
  CategoryListResponse,
  FoodCategory,
  FoodSafetyResult,
  HealthResponse,
  PetInfo,
  SearchResponse,
  StatsResponse,
} from '../types';

/**
 * Base URL for the API.
 *
 * `/api` is the default so a same-origin deploy (or the Vite dev proxy) needs no
 * configuration at all; set `VITE_API_URL` when the API lives elsewhere.
 */
export const API_BASE_URL: string = (
  import.meta.env.VITE_API_URL as string | undefined
)?.replace(/\/+$/, '') || '/api';

/** The UI should never hang on a slow API — match the backend's own budgets. */
export const DEFAULT_TIMEOUT_MS = 8000;

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Build a query string, skipping empty values so URLs stay clean. */
export function buildQuery(params: Record<string, string | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value);
    }
  }
  const encoded = search.toString();
  return encoded ? `?${encoded}` : '';
}

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });

    if (!response.ok) {
      let detail = response.statusText || `Request failed (${response.status})`;
      try {
        const body = (await response.json()) as { message?: string; error?: string };
        detail = body.message || body.error || detail;
      } catch {
        // Non-JSON error body — keep the status text.
      }
      throw new ApiError(detail, response.status);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('That took too long. Please try again.', 408);
    }

    throw new ApiError('Could not reach PetPal. Check your connection.', 0);
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  /** The headline check — GET so results are linkable and cacheable. */
  checkFoodSafety(pet: string, food: string): Promise<FoodSafetyResult> {
    return requestJson<FoodSafetyResult>(
      `/food-safety/check${buildQuery({ pet, food })}`,
    );
  },

  getSupportedPets(): Promise<PetInfo> {
    return requestJson<PetInfo>('/food-safety/pets');
  },

  getStats(): Promise<StatsResponse> {
    return requestJson<StatsResponse>('/food-safety/stats');
  },

  search(query: string, pet?: string): Promise<SearchResponse> {
    return requestJson<SearchResponse>(
      `/food-safety/search${buildQuery({ q: query, pet })}`,
    );
  },

  getSafeFoods(pet: string): Promise<CategoryListResponse> {
    return listCategory('safe', pet);
  },

  getCautionFoods(pet: string): Promise<CategoryListResponse> {
    return listCategory('caution', pet);
  },

  getUnsafeFoods(pet: string): Promise<CategoryListResponse> {
    return listCategory('unsafe', pet);
  },

  health(): Promise<HealthResponse> {
    return requestJson<HealthResponse>('/health');
  },
};

function listCategory(category: FoodCategory, pet: string): Promise<CategoryListResponse> {
  return requestJson<CategoryListResponse>(
    `/food-safety/${category}/${encodeURIComponent(pet)}`,
  );
}
