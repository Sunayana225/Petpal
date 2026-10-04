/**
 * The only place in the backend that reads `process.env`.
 *
 * Values are exposed as **getters**, not a snapshot, for two reasons:
 *  - a missing or invalid value fails at the point of use, with a clear message,
 *    rather than at import time;
 *  - tests can set an environment variable and have the next call observe it.
 *
 * Everything here returns a plain typed value, so no other module needs to know
 * how a variable is spelled, parsed or defaulted.
 */

/** Origins allowed to make credentialed requests outside production. */
export const DEV_ORIGINS = [
  'http://localhost:3000', // Vite dev server / SPA
  'http://localhost:8081', // Expo / Metro
  'http://localhost:19006', // Expo web
  'http://127.0.0.1:3000',
  'exp://localhost:19000', // Expo Go
];

function parsePositiveInt(value: string | undefined): number | null {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export const env = {
  // -- runtime ---------------------------------------------------------------

  get nodeEnv(): string {
    return process.env.NODE_ENV || 'development';
  },
  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  },
  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  },
  get isTest(): boolean {
    return this.nodeEnv === 'test';
  },
  get trustProxy(): boolean {
    return process.env.TRUST_PROXY === '1';
  },
  get port(): number {
    return Number.parseInt(process.env.PORT || '3001', 10);
  },

  // -- secrets & sessions ----------------------------------------------------

  /**
   * Session signing secret. A real value is mandatory in production; the
   * development fallback exists only so `npm run dev` works out of the box.
   */
  get sessionSecret(): string {
    const secret = process.env.SESSION_SECRET;
    if (secret) return secret;
    if (this.isProduction) throw new Error('SESSION_SECRET must be set in production');
    return 'petpal-dev-secret-change-me';
  },
  get adminToken(): string | undefined {
    return process.env.ADMIN_TOKEN;
  },
  /** Emails promoted to `admin` on first login. */
  get adminEmails(): string[] {
    return (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
  },

  /**
   * `SameSite` for the sign-in cookie. The default (`lax`) suits a same-site
   * deploy. Use `none` when the web app and this API are on *different* sites
   * (e.g. the web app on `*.vercel.app`, the API on `*.onrender.com`) — without
   * it the browser drops the cookie and sign-in silently fails.
   */
  get sessionCookieSameSite(): 'lax' | 'strict' | 'none' {
    const value = (process.env.SESSION_COOKIE_SAMESITE ?? '').toLowerCase();
    return value === 'strict' || value === 'none' ? value : 'lax';
  },
  /**
   * `Secure` is implied whenever `SameSite=None`: browsers reject a
   * `SameSite=None` cookie that is not `Secure`, and `Secure` needs HTTPS.
   */
  get sessionCookieSecure(): boolean {
    return this.isProduction || this.sessionCookieSameSite === 'none';
  },
  /** Optional: pin the cookie to a parent domain, e.g. `.example.com`. */
  get sessionCookieDomain(): string | undefined {
    return process.env.SESSION_COOKIE_DOMAIN || undefined;
  },

  // -- HTTP ------------------------------------------------------------------

  /**
   * Explicit cross-origin allowlist. When `CORS_ORIGIN` is unset this is the
   * dev origins outside production and an empty list in production — a deployed
   * API trusts no cross-origin caller until one is named.
   */
  get corsOrigins(): string[] {
    const configured = (process.env.CORS_ORIGIN ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    if (configured.length) return configured;
    return this.isProduction ? [] : DEV_ORIGINS;
  },
  get webAppUrl(): string {
    return process.env.WEB_APP_URL ?? 'http://localhost:3000';
  },
  get rateLimitWindowMs(): number {
    return Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10);
  },
  get rateLimitMax(): number {
    return Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);
  },
  get logLevel(): string {
    return (process.env.LOG_LEVEL ?? '').toLowerCase();
  },

  // -- OAuth -----------------------------------------------------------------

  get oauthCallbackBase(): string {
    return process.env.OAUTH_CALLBACK_BASE ?? `http://localhost:${this.port}`;
  },
  get githubClientId(): string | undefined {
    return process.env.GITHUB_CLIENT_ID;
  },
  get githubClientSecret(): string | undefined {
    return process.env.GITHUB_CLIENT_SECRET;
  },
  get googleClientId(): string | undefined {
    return process.env.GOOGLE_CLIENT_ID;
  },
  get googleClientSecret(): string | undefined {
    return process.env.GOOGLE_CLIENT_SECRET;
  },
  /** Dev sign-in shortcut: allowed outside production unless disabled. */
  get devAuthEnabled(): boolean {
    return this.nodeEnv !== 'production' || process.env.DEV_AUTH === '1';
  },

  // -- AI --------------------------------------------------------------------

  get geminiApiKey(): string | undefined {
    return process.env.GEMINI_API_KEY;
  },
  get geminiModel(): string {
    return process.env.GEMINI_MODEL ?? 'gemini-3.8-flash';
  },
  /** How long a durable AI answer stays fresh (hours). */
  get aiAnswerTtlHours(): number {
    return parsePositiveInt(process.env.AI_ANSWER_TTL_HOURS) ?? 168;
  },
  /** Whether unreviewed AI answers may be served (vs. only human-approved). */
  get serveUnreviewedAi(): boolean {
    return (process.env.AI_CACHE_SERVE_UNREVIEWED ?? 'true') !== 'false';
  },

  // -- data & keys -----------------------------------------------------------

  get dbPath(): string | undefined {
    return process.env.DB_PATH || undefined;
  },
  /** Default per-key quota; `null` means unlimited. */
  get defaultKeyQuota(): number | null {
    const parsed = Number.parseInt(process.env.DEFAULT_KEY_QUOTA ?? '', 10);
    return Number.isFinite(parsed) ? parsed : null;
  },
  /** Unvalidated window name — the caller narrows it to a known window. */
  get defaultKeyWindow(): string | undefined {
    return process.env.DEFAULT_KEY_WINDOW;
  },
};
