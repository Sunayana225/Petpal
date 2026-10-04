import { createDatabase, type Db } from '../db/database';
import { AiAnswerRepository } from '../repositories/aiAnswerRepository';
import { DurableAnswerCache } from '../services/answerCache';
import { type AnswerSource } from '../services/answerSources';
import { foodSafetyRepository } from '../services/foodSafetyRepository';
import { FoodSafetyService } from '../services/foodSafetyService';
import type { FoodSafetyResult, SafetyLevel } from '../types/foodSafety';

/**
 * A species outside the curated ten (e.g. "tiger") must reach the AI sources
 * rather than being refused up front.
 */
describe('unsupported species', () => {
  let db: Db;

  beforeEach(() => {
    db = createDatabase(':memory:');
  });

  function stub(safety: SafetyLevel): { source: AnswerSource; calls: () => number } {
    let calls = 0;
    return {
      calls: () => calls,
      source: {
        source: 'ai',
        resolve: async (petLabel, pet, food): Promise<FoodSafetyResult> => {
          void petLabel;
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

  test('falls through to the AI sources instead of refusing', async () => {
    const cache = new DurableAnswerCache(new AiAnswerRepository(db));
    const s = stub('caution');
    const service = new FoodSafetyService(foodSafetyRepository, [s.source], cache);

    const result = await service.checkFoodSafety('tiger', 'chicken');

    expect(s.calls()).toBe(1);
    expect(result.safety).toBe('caution');
    expect(result.pet).toBe('tiger');
  });

  test('a blank pet still short-circuits with no remote call', async () => {
    const cache = new DurableAnswerCache(new AiAnswerRepository(db));
    const s = stub('safe');
    const service = new FoodSafetyService(foodSafetyRepository, [s.source], cache);

    const result = await service.checkFoodSafety('   ', 'chicken');

    expect(s.calls()).toBe(0);
    expect(result.safety).toBe('unknown');
  });

  test('a BYOK key bypasses a cached unknown and gets a fresh answer', async () => {
    const cache = new DurableAnswerCache(new AiAnswerRepository(db));
    // Prime the cache with a stale unknown, as a failed no-key call would.
    cache.recordAnswer('tiger', {
      pet: 'tiger',
      food: 'chicken',
      safety: 'unknown',
      message: 'stale',
      source: 'none',
    });

    const s = stub('caution');
    const service = new FoodSafetyService(foodSafetyRepository, [s.source], cache);
    const result = await service.checkFoodSafety('tiger', 'chicken', { apiKey: 'user-key' });

    expect(s.calls()).toBe(1);
    expect(result.safety).toBe('caution');
  });
});
