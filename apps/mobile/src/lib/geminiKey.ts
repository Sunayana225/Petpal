import * as SecureStore from 'expo-secure-store';

/**
 * The user's own Gemini API key, stored in the device keychain via SecureStore.
 *
 * The API client needs it synchronously, so the value is cached in memory after
 * an async load at startup. It is sent to our API as `x-gemini-key` for AI
 * calls only, and is never persisted on the server.
 */

const KEY_STORE = 'petpal.geminiKey';
const ONBOARDED_STORE = 'petpal.onboarded';

let cachedKey: string | null = null;
let loaded = false;

/** Synchronous read of the in-memory copy (call `loadGeminiKey` first). */
export function getGeminiKeySync(): string | null {
  return cachedKey;
}

export async function loadGeminiKey(): Promise<string | null> {
  if (!loaded) {
    try {
      cachedKey = await SecureStore.getItemAsync(KEY_STORE);
    } catch {
      cachedKey = null;
    }
    loaded = true;
  }
  return cachedKey;
}

export async function saveGeminiKey(key: string): Promise<void> {
  cachedKey = key;
  loaded = true;
  try {
    await SecureStore.setItemAsync(KEY_STORE, key);
  } catch {
    // Keychain unavailable — the key still works for this session.
  }
}

export async function clearGeminiKey(): Promise<void> {
  cachedKey = null;
  loaded = true;
  try {
    await SecureStore.deleteItemAsync(KEY_STORE);
  } catch {
    // Ignore.
  }
}

/** Whether the user has finished (or skipped) the key screen. */
export async function isOnboarded(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(ONBOARDED_STORE)) === '1';
  } catch {
    return false;
  }
}

export async function markOnboarded(): Promise<void> {
  try {
    await SecureStore.setItemAsync(ONBOARDED_STORE, '1');
  } catch {
    // Ignore.
  }
}
