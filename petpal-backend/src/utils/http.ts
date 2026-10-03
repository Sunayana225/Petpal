/**
 * `fetch` with a hard timeout.
 *
 * Neither Open Pet Food Facts nor Google's API is obliged to answer promptly.
 * Without an abort signal a hung upstream socket holds the user's request (and
 * one of Node's limited sockets) open indefinitely — the rate limiter does not
 * help, because the limiter counts *arrivals*, not in-flight work.
 */
export const DEFAULT_TIMEOUT_MS = 3000;

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Thrown when a remote call exceeds {@link fetchWithTimeout}'s budget. */
export class TimeoutError extends Error {
  constructor(url: string, timeoutMs: number) {
    super(`Request to ${url} timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}
