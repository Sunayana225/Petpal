/**
 * A tiny TTL cache with request coalescing.
 *
 * PetPal sits in front of two paid/remote dependencies (Open Pet Food Facts and
 * the Gemini API). Without caching, every unknown food costs a real API call,
 * and concurrent users asking the same question each pay for it separately.
 *
 * `getOrSet` collapses those concurrent callers into a single upstream request.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  coalesced: number;
}

export class TtlCache<T = unknown> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly inflight = new Map<string, Promise<T>>();

  private hits = 0;
  private misses = 0;
  private coalesced = 0;

  /**
   * @param maxEntries upper bound before oldest entries are evicted, so the
   *                   cache can never grow without limit in a long-lived process.
   */
  constructor(private readonly maxEntries: number = 1000) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }
    this.hits++;
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    if (ttlMs <= 0) return;
    if (!this.store.has(key) && this.store.size >= this.maxEntries) {
      this.evictOldest();
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
    this.inflight.clear();
    this.hits = 0;
    this.misses = 0;
    this.coalesced = 0;
  }

  get stats(): CacheStats {
    return { size: this.store.size, hits: this.hits, misses: this.misses, coalesced: this.coalesced };
  }

  /**
   * Return the cached value, or run `factory` exactly once for every caller
   * currently asking for the same key and cache the result.
   *
   * Failed factories are *not* cached — a transient upstream failure must not
   * be memoised for the TTL window.
   */
  async getOrSet(
    key: string,
    ttlMs: number | ((value: T) => number),
    factory: () => Promise<T>,
  ): Promise<{ value: T; fromCache: boolean }> {
    const cached = this.get(key);
    if (cached !== undefined) return { value: cached, fromCache: true };

    const existing = this.inflight.get(key);
    if (existing) {
      this.coalesced++;
      return { value: await existing, fromCache: true };
    }

    const promise = factory().finally(() => {
      this.inflight.delete(key);
    });
    this.inflight.set(key, promise);

    const value = await promise;
    // Let callers cache "definitive" answers for longer than guesses.
    const ttl = typeof ttlMs === 'function' ? ttlMs(value) : ttlMs;
    this.set(key, value, ttl);
    return { value, fromCache: false };
  }

  private evictOldest(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt <= now) this.store.delete(key);
    }
    // Map preserves insertion order, so the first key is the oldest live one.
    while (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next();
      if (oldest.done) break;
      this.store.delete(oldest.value);
    }
  }
}

/** Time-to-live constants for each answer layer (milliseconds). */
export const TTL = {
  /** Unknown/no-data verdicts — retry reasonably soon. */
  unknown: 5 * 60 * 1000,
  /** Open Pet Food Facts lookups. */
  external: 60 * 60 * 1000,
  /** Gemini answers — the most expensive, and slowest to change. */
  ai: 6 * 60 * 60 * 1000,
} as const;
