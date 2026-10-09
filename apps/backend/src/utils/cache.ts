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
  inflight: number;
  evictions: number;
  expired: number;
  capacity: number;
  maxInflight: number;
  hitRatio: number;
}

export class CacheCapacityError extends Error {
  constructor() { super('Cache has reached its concurrent factory limit.'); this.name = 'CacheCapacityError'; }
}

export class TtlCache<T = unknown> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly inflight = new Map<string, Promise<T>>();
  private hits = 0;
  private misses = 0;
  private coalesced = 0;
  private evictions = 0;
  private expired = 0;

  constructor(private readonly maxEntries = 1000, private readonly maxInflight = 100) {
    if (!Number.isSafeInteger(maxEntries) || maxEntries < 1 || !Number.isSafeInteger(maxInflight) || maxInflight < 1) throw new RangeError('Cache capacities must be positive safe integers.');
  }

  peek(key: string): T | undefined {
    const entry = this.store.get(key);
    if (entry && Date.now() >= entry.expiresAt) { this.store.delete(key); this.expired++; return undefined; }
    return entry?.value;
  }

  get(key: string): T | undefined {
    const value = this.peek(key);
    if (value === undefined) { this.misses++; return undefined; }
    this.hits++;
    const entry = this.store.get(key)!;
    this.store.delete(key); this.store.set(key, entry);
    return value;
  }

  set(key: string, value: T, ttlMs: number): void {
    // Explicit writes supersede pending factories and expired values.
    this.inflight.delete(key);
    if (!Number.isFinite(ttlMs)) throw new RangeError('Cache TTL must be finite.');
    if (ttlMs <= 0 || value === undefined) { this.store.delete(key); return; }
    this.prune();
    this.store.delete(key);
    while (this.store.size >= this.maxEntries) {
      this.store.delete(this.store.keys().next().value!); this.evictions++;
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  has(key: string): boolean { return this.peek(key) !== undefined; }
  delete(key: string): void { this.store.delete(key); this.inflight.delete(key); }
  prune(): number {
    const before = this.store.size;
    for (const [key, entry] of this.store) if (entry.expiresAt <= Date.now()) this.store.delete(key);
    const removed = before - this.store.size;
    this.expired += removed;
    return removed;
  }
  clear(): void {
    this.store.clear(); this.inflight.clear();
    this.hits = 0; this.misses = 0; this.coalesced = 0; this.evictions = 0; this.expired = 0;
  }
  get stats(): CacheStats {
    this.prune();
    return { size: this.store.size, hits: this.hits, misses: this.misses, coalesced: this.coalesced,
      inflight: this.inflight.size, evictions: this.evictions, expired: this.expired, capacity: this.maxEntries, maxInflight: this.maxInflight,
      hitRatio: this.hits + this.misses ? this.hits / (this.hits + this.misses) : 0 };
  }

  async getOrSet(key: string, ttlMs: number | ((value: T) => number), factory: () => Promise<T>): Promise<{ value: T; fromCache: boolean }> {
    const cached = this.get(key);
    if (cached !== undefined) return { value: cached, fromCache: true };
    const existing = this.inflight.get(key);
    if (existing) { this.coalesced++; return { value: await existing, fromCache: true }; }
    if (this.inflight.size >= this.maxInflight) throw new CacheCapacityError();
    // Deferring the factory also captures synchronous throws and installs the owner first.
    const promise = Promise.resolve().then(factory).then(value => {
      if (this.inflight.get(key) === promise) this.set(key, value, typeof ttlMs === 'function' ? ttlMs(value) : ttlMs);
      return value;
    }).finally(() => {
      // An invalidated old factory must never remove a newer factory for the same key.
      if (this.inflight.get(key) === promise) this.inflight.delete(key);
    });
    this.inflight.set(key, promise);
    return { value: await promise, fromCache: false };
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
