import { TtlCache, CacheCapacityError } from '../utils/cache';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
describe('bounded cache ownership', () => {
  test.each([0, -1, 1.5, Infinity, NaN])('rejects entry capacity %s', capacity => { expect(() => new TtlCache(capacity)).toThrow(RangeError); });
  test.each([0, -1, 1.5, Infinity, NaN])('rejects factory capacity %s', capacity => { expect(() => new TtlCache(1, capacity)).toThrow(RangeError); });
  test('evicts least recently used records and exposes accurate counters', () => {
    const cache = new TtlCache<number>(2);
    cache.set('a', 1, 1000); cache.set('b', 2, 1000); cache.get('a'); cache.set('c', 3, 1000);
    expect(cache.has('b')).toBe(false); expect(cache.has('a')).toBe(true); expect(cache.get('a')).toBe(1);
    expect(cache.stats).toMatchObject({ size: 2, evictions: 1, hits: 2, misses: 0, hitRatio: 1, capacity: 2 });
  });
  test('TTL zero removes existing values and nonfinite TTL fails', () => {
    const cache = new TtlCache<number>(); cache.set('a', 1, 1000); cache.set('a', 2, 0);
    expect(cache.has('a')).toBe(false);
    expect(() => cache.set('a', 1, Infinity)).toThrow(RangeError);
    expect(() => cache.set('a', 1, NaN)).toThrow(RangeError);
  });
  test('prunes expired entries without has or peek inflating hits', () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1000);
    try {
      const cache = new TtlCache<number>(); cache.set('a', 1, 10); cache.set('b', 2, 20);
      expect(cache.has('a')).toBe(true); expect(cache.peek('a')).toBe(1); expect(cache.stats.hits).toBe(0);
      now.mockReturnValue(1010); expect(cache.prune()).toBe(1);
      now.mockReturnValue(1020); expect(cache.stats).toMatchObject({ size: 0, expired: 2 });
    } finally { now.mockRestore(); }
  });
  test('same-key work coalesces at capacity but distinct work fails promptly', async () => {
    const cache = new TtlCache<number>(10, 1); const work = deferred<number>();
    const factory = jest.fn(() => work.promise);
    const first = cache.getOrSet('a', 1000, factory); const second = cache.getOrSet('a', 1000, factory);
    await expect(cache.getOrSet('b', 1000, async () => 2)).rejects.toBeInstanceOf(CacheCapacityError);
    expect(cache.stats).toMatchObject({ inflight: 1, coalesced: 1 });
    work.resolve(1); await Promise.all([first, second]); expect(factory).toHaveBeenCalledTimes(1);
    expect(cache.stats.inflight).toBe(0);
  });
  test('failed and synchronously throwing factories release capacity for retries', async () => {
    const cache = new TtlCache<number>(1, 1);
    await expect(cache.getOrSet('a', 1000, () => { throw new Error('failed'); })).rejects.toThrow('failed');
    expect(cache.stats.inflight).toBe(0);
    await expect(cache.getOrSet('a', 1000, async () => 2)).resolves.toMatchObject({ value: 2, fromCache: false });
  });
  test.each(['clear', 'delete'])('%s prevents late results restoring invalidated values', async method => {
    const cache = new TtlCache<number>(); const work = deferred<number>();
    const pending = cache.getOrSet('a', 1000, () => work.promise);
    if (method === 'clear') cache.clear(); else cache.delete('a');
    work.resolve(1); await pending; expect(cache.has('a')).toBe(false);
  });
  test('an old completion cannot erase or overwrite a newer same-key factory', async () => {
    const cache = new TtlCache<number>(); const old = deferred<number>(); const current = deferred<number>();
    const first = cache.getOrSet('a', 1000, () => old.promise); cache.delete('a');
    const second = cache.getOrSet('a', 1000, () => current.promise);
    old.resolve(1); await first; expect(cache.stats.inflight).toBe(1); expect(cache.has('a')).toBe(false);
    current.resolve(2); await second; expect(cache.get('a')).toBe(2);
  });
  test('explicit writes supersede pending factories', async () => {
    const cache = new TtlCache<number>(); const work = deferred<number>();
    const pending = cache.getOrSet('a', 1000, () => work.promise); cache.set('a', 9, 1000);
    work.resolve(1); await pending; expect(cache.get('a')).toBe(9);
  });
});
