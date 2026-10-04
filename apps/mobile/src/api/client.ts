import { getGeminiKeySync } from '../lib/geminiKey';

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

/**
 * The single fetch wrapper every mobile API module uses. It owns the timeout,
 * the error shape, JSON headers and the visitor's own Gemini key — nothing
 * about specific endpoints.
 */
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
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
