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
  const abort = () => controller.abort(init.signal?.reason);
  if (init.signal?.aborted) abort(); else init.signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    // Consume the body under the same deadline; fetch resolves at headers.
    const reader = response.body?.getReader();
    if (!reader) return response;
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 2 * 1024 * 1024) { await reader.cancel(); throw new Error('Upstream response exceeded 2MB'); }
      chunks.push(value);
    }
    return new Response(Buffer.concat(chunks), { status: response.status, statusText: response.statusText, headers: response.headers });
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener('abort', abort);
  }
}

/** Thrown when a remote call exceeds {@link fetchWithTimeout}'s budget. */
export class TimeoutError extends Error {
  constructor(url: string, timeoutMs: number) {
    super(`Request to ${url} timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}
