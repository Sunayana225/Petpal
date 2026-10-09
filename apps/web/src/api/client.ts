export const API_BASE_URL: string = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') || '/api';
export const DEFAULT_TIMEOUT_MS = 40000;
let csrfToken: string | null = null;
export function setCsrfToken(value: string | null): void { csrfToken = value; }

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly requestId?: string, readonly errorCode?: string) {
    super(message); this.name = 'ApiError';
  }
}
export function buildQuery(params: Record<string, string | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  }
  const encoded = search.toString();
  return encoded ? `?${encoded}` : '';
}
function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    if (signal.aborted) abort(); else signal.addEventListener('abort', abort, { once: true });
  });
}
export async function requestJson<T>(path: string, init: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort(init.signal?.reason);
  if (init.signal?.aborted) abort(); else init.signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const method = (init.method ?? 'GET').toUpperCase();
  const safe = ['GET', 'HEAD'].includes(method);
  try {
    if (!safe && !csrfToken && !path.startsWith('/auth/dev-login')) {
      const session = await requestJson<{ csrfToken?: string }>('/auth/me', { signal: controller.signal }, timeoutMs);
      csrfToken = session.csrfToken ?? null;
    }
    const headers = new Headers(init.headers);
    if (!headers.has('Accept')) headers.set('Accept', 'application/json');
    if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    if (!safe && csrfToken) headers.set('X-CSRF-Token', csrfToken);
    for (let attempt = 0; ; attempt++) {
      let response: Response;
      try {
        response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, credentials: 'include', signal: controller.signal });
      } catch (error) {
        if (safe && attempt < 2 && !controller.signal.aborted) { await delay(100 * 2 ** attempt + Math.random() * 100, controller.signal); continue; }
        throw error;
      }
      if (safe && [502, 503, 504].includes(response.status) && attempt < 2) {
        await response.body?.cancel();
        await delay(100 * 2 ** attempt + Math.random() * 100, controller.signal);
        continue;
      }
      if (!response.ok) {
        let detail = response.statusText || `Request failed (${response.status})`;
        let requestId = response.headers.get('x-request-id') ?? undefined;
        let errorCode: string | undefined;
        try {
          const body = await response.json() as { message?: string; error?: string; requestId?: string; errorCode?: string };
          detail = body.message || body.error || detail;
          requestId = body.requestId ?? requestId; errorCode = body.errorCode;
        } catch { /* Non-JSON errors retain their HTTP status. */ }
        if (errorCode === 'CSRF_INVALID') csrfToken = null;
        throw new ApiError(detail, response.status, requestId, errorCode);
      }
      if (response.status === 204 || method === 'HEAD') return undefined as T;
      const text = await response.text();
      return (text ? JSON.parse(text) : undefined) as T;
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (init.signal?.aborted) throw new ApiError('Request cancelled.', 499);
    if (controller.signal.aborted) throw new ApiError('That took too long. Please try again.', 408);
    throw new ApiError('Could not reach PetPal. Check your connection.', 0);
  } finally {
    clearTimeout(timer); init.signal?.removeEventListener('abort', abort);
  }
}
