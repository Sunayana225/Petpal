import { captureAttribution, getAttribution, type Attribution } from './attribution';

/**
 * Privacy-first analytics wiring.
 *
 * Deliberately provider-agnostic: it speaks the tiny, shared API both
 * Plausible and Umami expose on `window`, loads nothing unless you configure a
 * site, and never sets a cookie of its own. Set ONE of the following in `.env`:
 *
 *   VITE_PLAUSIBLE_DOMAIN=petpal.example.com
 *   VITE_UMAMI_WEBSITE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 *   VITE_UMAMI_SRC=https://analytics.example.com/script.js
 *
 * With none set, the site runs with zero third-party scripts.
 */

type Props = Record<string, string>;

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Props }) => void;
    umami?: { track: (event?: string | Props, data?: Props) => void };
  }
}

const PLAUSIBLE_SRC = 'https://plausible.io/js/script.js';

let provider: 'plausible' | 'umami' | null = null;

function loadScript(src: string, attributes: Record<string, string>): void {
  if (typeof document === 'undefined') return;
  if (document.querySelector(`script[src="${src}"]`)) return;

  const script = document.createElement('script');
  script.defer = true;
  script.src = src;
  // We emit pageviews ourselves so SPA route changes are counted exactly once.
  script.dataset.autoTrack = 'false';
  for (const [name, value] of Object.entries(attributes)) {
    script.setAttribute(name, value);
  }
  document.head.appendChild(script);
}

/** Capture campaign parameters and load the configured provider, if any. */
export function initAnalytics(): void {
  captureAttribution();

  const plausibleDomain = import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined;
  const umamiId = import.meta.env.VITE_UMAMI_WEBSITE_ID as string | undefined;
  const umamiSrc = import.meta.env.VITE_UMAMI_SRC as string | undefined;

  if (plausibleDomain) {
    provider = 'plausible';
    loadScript(PLAUSIBLE_SRC, { 'data-domain': plausibleDomain });
  } else if (umamiId && umamiSrc) {
    provider = 'umami';
    loadScript(umamiSrc, { 'data-website-id': umamiId });
  }
}

function attributionProps(): Props {
  const attribution: Attribution = getAttribution();
  const props: Props = {};
  for (const [key, value] of Object.entries(attribution)) {
    if (value) props[key] = value;
  }
  return props;
}

/**
 * Send exactly one pageview per route. `isInitial` lets us defer to Plausible's
 * own first-load pageview while still counting it ourselves for Umami (whose
 * auto-tracking we disable).
 */
export function trackPageview(isInitial = false): void {
  const props = attributionProps();
  const hasProps = Object.keys(props).length > 0;

  if (provider === 'plausible') {
    if (isInitial) return; // the script sends the first pageview itself
    window.plausible?.('pageview', hasProps ? { props } : undefined);
    return;
  }

  if (provider === 'umami') {
    window.umami?.track();
    if (hasProps) window.umami?.track('attribution', props);
  }
}

/**
 * Keep a clean canonical URL so `?utm_*` variants are not indexed as duplicate
 * pages. The parameter-free path is the canonical form.
 */
export function setCanonical(path: string): void {
  if (typeof document === 'undefined') return;

  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = `${window.location.origin}${path}`;
}
