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
  const parsed = Number(value);
  return /^\d+$/.test(value ?? '') && Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function boundedInt(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
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
    return boundedInt('PORT', 3001, 1, 65535);
  },

  // -- secrets & sessions ----------------------------------------------------

  /**
   * Session signing secret. A real value is mandatory in production; the
   * development fallback exists only so `npm run dev` works out of the box.
   */
  get sessionSecret(): string {
    const secret = process.env.SESSION_SECRET;
    if (secret) {
      if (this.isProduction && Buffer.byteLength(secret) < 32) throw new Error('SESSION_SECRET needs at least 32 bytes in production');
      return secret;
    }
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
    return boundedInt('RATE_LIMIT_WINDOW_MS', 900000, 1000, 86400000);
  },
  get rateLimitMax(): number {
    return boundedInt('RATE_LIMIT_MAX_REQUESTS', 100, 1, 1000000);
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
    return (this.isDevelopment || this.isTest) && process.env.DEV_AUTH !== '0';
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
    return boundedInt('AI_ANSWER_TTL_HOURS', 168, 1, 8760);
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
    return process.env.DEFAULT_KEY_QUOTA ? boundedInt('DEFAULT_KEY_QUOTA', 0, 0, 1000000000) : null;
  },
  /** Unvalidated window name — the caller narrows it to a known window. */
  get defaultKeyWindow(): string | undefined {
    return process.env.DEFAULT_KEY_WINDOW;
  },
  get sessionSecrets(): string[] {
    const old = (process.env.SESSION_PREVIOUS_SECRETS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    if (this.isProduction && old.some((s) => Buffer.byteLength(s) < 32)) throw new Error('Previous session secrets need at least 32 bytes');
    return [this.sessionSecret, ...old];
  },
  get sessionAbsoluteMs(): number { return boundedInt('SESSION_ABSOLUTE_MS', 86400000, 60000, 2592000000); },
  get sessionIdleMs(): number { return boundedInt('SESSION_IDLE_MS', 1800000, 60000, 86400000); },
  get reauthMs(): number { return boundedInt('REAUTH_MS', 600000, 60000, 3600000); },
  get oauthTransactionMs(): number { return boundedInt('OAUTH_TRANSACTION_MS', 600000, 30000, 1800000); },
  get maxActiveKeys(): number { return boundedInt('MAX_ACTIVE_KEYS', 20, 1, 1000); },
  get accountDailyQuota(): number { return boundedInt('ACCOUNT_DAILY_QUOTA', 10000, 1, 1000000000); },
  get keyBurstLimit(): number { return boundedInt('KEY_BURST_LIMIT', 60, 1, 100000); },
  get loginLimit(): number { return boundedInt('LOGIN_LIMIT', 30, 1, 10000); },
  get aiConcurrency(): number { return boundedInt('AI_CONCURRENCY', 4, 1, 64); },
};

export function validateEnvironment(): void {
  void env.port; void env.sessionSecrets; void env.rateLimitWindowMs; void env.rateLimitMax;
  void env.sessionAbsoluteMs; void env.sessionIdleMs; void env.reauthMs; void env.oauthTransactionMs;
  void env.maxActiveKeys; void env.accountDailyQuota; void env.keyBurstLimit; void env.loginLimit; void env.aiConcurrency;
  void env.defaultKeyQuota;
  if (env.defaultKeyWindow && !['day', 'month', 'total'].includes(env.defaultKeyWindow)) throw new Error('Invalid DEFAULT_KEY_WINDOW');
  if (process.env.AI_ANSWER_TTL_HOURS && !parsePositiveInt(process.env.AI_ANSWER_TTL_HOURS)) throw new Error('Invalid AI_ANSWER_TTL_HOURS');
  if (process.env.SESSION_COOKIE_SAMESITE && !['lax', 'strict', 'none'].includes(process.env.SESSION_COOKIE_SAMESITE)) throw new Error('Invalid SESSION_COOKIE_SAMESITE');
  if (env.isProduction) {
    for (const [name, value] of [['WEB_APP_URL', env.webAppUrl], ['OAUTH_CALLBACK_BASE', env.oauthCallbackBase]]) {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
        throw new Error(`${name} must be an HTTPS origin`);
      }
    }
    for (const origin of env.corsOrigins) {
      if (new URL(origin).origin !== origin || !origin.startsWith('https://')) throw new Error('CORS_ORIGIN must contain HTTPS origins');
    }
    if (env.sessionCookieSameSite === 'none' && !env.corsOrigins.includes(new URL(env.webAppUrl).origin)) throw new Error('Cross-site cookies require WEB_APP_URL in CORS_ORIGIN');
  }
}
