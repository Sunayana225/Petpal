/**
 * Campaign attribution (UTM) capture.
 *
 * Landing pages receive marketing parameters such as
 * `?utm_source=chatgpt.com&utm_medium=referral`. We read them once, on first
 * load, and keep them for the session (last-touch) and for the browser
 * (first-touch). Nothing here sets a cookie or profiles a visitor — it is a
 * plain, first-party record of where a visit came from.
 */

const CAMPAIGN_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
  'ref',
] as const;

export type AttributionKey = (typeof CAMPAIGN_KEYS)[number];
export type Attribution = Partial<Record<AttributionKey, string>>;

const SESSION_KEY = 'petpal:attribution:last';
const FIRST_TOUCH_KEY = 'petpal:attribution:first';

/** Campaign values are free text from a URL; keep them short and inert. */
const MAX_LENGTH = 120;

function safeGet(storage: 'sessionStorage' | 'localStorage', key: string): Attribution | null {
  try {
    const raw = window[storage].getItem(key);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
}

function safeSet(storage: 'sessionStorage' | 'localStorage', key: string, value: Attribution): void {
  try {
    window[storage].setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be full or blocked (private mode); attribution is optional.
  }
}

function readFromSearch(search: string): Attribution {
  const params = new URLSearchParams(search);
  const found: Attribution = {};

  for (const key of CAMPAIGN_KEYS) {
    const value = params.get(key)?.trim();
    if (value) found[key] = value.slice(0, MAX_LENGTH);
  }

  return found;
}

/**
 * Read the current URL's campaign parameters and persist them. Called once at
 * startup, before the router can touch the URL. Returns the captured values
 * (falling back to whatever was stored previously).
 */
export function captureAttribution(search: string = window.location.search): Attribution {
  const found = readFromSearch(search);

  if (Object.keys(found).length === 0) {
    return getAttribution();
  }

  safeSet('sessionStorage', SESSION_KEY, found);
  // First-touch attribution is only ever written once, so the original source
  // of the visit is preserved across the whole session.
  if (!safeGet('localStorage', FIRST_TOUCH_KEY)) {
    safeSet('localStorage', FIRST_TOUCH_KEY, found);
  }

  return found;
}

/** The most recent campaign values seen this session. */
export function getAttribution(): Attribution {
  return safeGet('sessionStorage', SESSION_KEY) ?? {};
}

/** The first campaign values ever seen in this browser. */
export function getFirstTouch(): Attribution {
  return safeGet('localStorage', FIRST_TOUCH_KEY) ?? {};
}
