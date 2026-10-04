import { foodSafetyRepository } from '../services/foodSafetyRepository';
import { FoodSafetyService } from '../services/foodSafetyService';
import type { AnswerSource } from '../services/answerSources';
import type { FoodSafetyResult } from '../types/foodSafety';

/**
 * Verifies the service-side capture: real AI verdicts are queued for review,
 * unknown answers are not. Uses a stub source so no network call is made.
 */
describe('AI answer capture', () => {
  function aiStub(safety: FoodSafetyResult['safety']): AnswerSource {
    return {
      source: 'ai',
      resolve: async (petKey, pet, food): Promise<FoodSafetyResult> => {
        void petKey;
        return {
          pet,
          food,
          safety,
          message: 'stub',
          details: { food, safety, description: 'stub detail' },
          source: 'ai',
        };
      },
    };
  }

  test('queues a real AI verdict for review', async () => {
    const recordAnswer = jest.fn();
    const service = new FoodSafetyService(foodSafetyRepository, [aiStub('caution')], {
      recordAnswer,
    });

    const result = await service.checkFoodSafety('dog', 'zorblax-fruit-xyz');

    expect(result.safety).toBe('caution');
    expect(recordAnswer).toHaveBeenCalledTimes(1);
    expect(recordAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ pet: 'dogs', food: 'zorblax-fruit-xyz', safety: 'caution' }),
    );
  });

  test('does not queue an unknown answer', async () => {
    const recordAnswer = jest.fn();
    const service = new FoodSafetyService(foodSafetyRepository, [aiStub('unknown')], {
      recordAnswer,
    });

    await service.checkFoodSafety('dog', 'zorblax-fruit-abc');

    expect(recordAnswer).not.toHaveBeenCalled();
  });
});
