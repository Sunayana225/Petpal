import { createDatabase, type Db } from '../db/database';
import { AiAnswerRepository } from '../repositories/aiAnswerRepository';
import { DurableAnswerCache } from '../services/answerCache';
import { FoodSafetyService } from '../services/foodSafetyService';
import { foodSafetyRepository } from '../repositories/foodSafetyRepository';
import type { AnswerSource } from '../services/answerSources';
import type { FoodSafetyResult, SafetyLevel } from '../domain/foodSafety';

/**
 * The core promise of the durable cache: once a food has been resolved
 * remotely, it is never sent to a remote source again — not on the next
 * request, and not after a "restart" (a fresh cache over the same database).
 */
describe('durable answer cache', () => {
  let db: Db;

  beforeEach(() => {
    db = createDatabase(':memory:');
  });

  /** A source that counts how many times it is actually consulted. */
  function countingSource(safety: SafetyLevel): { source: AnswerSource; calls: () => number } {
    let calls = 0;
    return {
      calls: () => calls,
      source: {
        source: 'ai',
        resolve: async (petKey, pet, food): Promise<FoodSafetyResult> => {
          void petKey;
          calls += 1;
          return {
            pet,
            food,
            safety,
            message: 'stub',
            details: { food, safety, description: 'stub detail' },
            source: 'ai',
          };
        },
      },
    };
  }

  test('a second request for the same food makes no remote call', async () => {
    const cache = new DurableAnswerCache(new AiAnswerRepository(db));
    const stub = countingSource('caution');

    const first = new FoodSafetyService(foodSafetyRepository, [stub.source], cache);
    await first.checkFoodSafety('dog', 'zorblax-fruit-xyz');
    expect(stub.calls()).toBe(1);

    const second = new FoodSafetyService(foodSafetyRepository, [stub.source], cache);
    const result = await second.checkFoodSafety('dog', 'zorblax-fruit-xyz');

    expect(stub.calls()).toBe(1); // served from cache, not the source
    expect(result.safety).toBe('caution');
  });

  test('survives a "restart": a fresh cache over the same database does not re-call', async () => {
    const repo = new AiAnswerRepository(db);
    const stub = countingSource('safe');

    await new FoodSafetyService(foodSafetyRepository, [stub.source], new DurableAnswerCache(repo))
      .checkFoodSafety('cat', 'zorblax-fruit-restart');
    expect(stub.calls()).toBe(1);

    // Simulate a process restart: brand-new cache, same durable database.
    const afterRestart = new FoodSafetyService(
      foodSafetyRepository,
      [stub.source],
      new DurableAnswerCache(repo),
    );
    await afterRestart.checkFoodSafety('cat', 'zorblax-fruit-restart');

    expect(stub.calls()).toBe(1);
  });

  test('caches a dead end so an unknown food is not asked again either', async () => {
    const cache = new DurableAnswerCache(new AiAnswerRepository(db));
    const stub = countingSource('unknown');

    await new FoodSafetyService(foodSafetyRepository, [stub.source], cache)
      .checkFoodSafety('dog', 'zorblax-fruit-unknown');
    expect(stub.calls()).toBe(1);

    await new FoodSafetyService(foodSafetyRepository, [stub.source], cache)
      .checkFoodSafety('dog', 'zorblax-fruit-unknown');

    expect(stub.calls()).toBe(1);
    expect(cache.stats().cached).toBe(1);
  });

  test('approved answers are permanent and pending ones are queued for review', async () => {
    const cache = new DurableAnswerCache(new AiAnswerRepository(db));
    const stub = countingSource('unsafe');

    await new FoodSafetyService(foodSafetyRepository, [stub.source], cache)
      .checkFoodSafety('dog', 'zorblax-fruit-review');

    const pending = cache.list('pending');
    expect(pending).toHaveLength(1);

    const approved = cache.approve(pending[0].id);
    expect(approved?.status).toBe('approved');
    expect(cache.stats().approved).toBe(1);
  });
});
