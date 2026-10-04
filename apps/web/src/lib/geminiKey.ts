/**
 * A user's own Gemini API key, kept for the browser session only.
 *
 * sessionStorage (not localStorage) so the key disappears when the tab closes
 * and never lingers on the machine. It is sent to our API per request, used for
 * that one Gemini call, and is never stored or logged server-side.
 */
const STORAGE_KEY = 'petpal:gemini-key';

export function getGeminiKey(): string | null {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setGeminiKey(key: string): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, key);
  } catch {
    // Storage can be blocked; the key just won't persist for the session.
  }
}

export function clearGeminiKey(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
}
