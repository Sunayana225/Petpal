import { Request, Response, Router } from 'express';
import { query } from 'express-validator';

import { asyncHandler } from '../../middleware/errorHandler';
import type { FoodSafetyService } from '../../services/foodSafetyService';
import { handleValidationErrors } from './check';

type Category = 'safe' | 'caution' | 'unsafe';

/**
 * The bulk/dataset endpoints: pets, stats, search and the three category lists.
 *
 * These expose the whole database, so every mount that serves this router puts
 * it behind an API key (see `routes/index.ts`). The router itself stays ignorant
 * of the surface it is mounted on.
 */
export function createDatasetRouter(service: FoodSafetyService): Router {
  const router = Router();

  /**
   * One factory for the three near-identical lists, so the response shape
   * (`safeFoods` / `cautionFoods` / `unsafeFoods` + `count`) cannot drift.
   */
  function listEndpoint(category: Category) {
    return asyncHandler(async (req: Request, res: Response) => {
      const pet = String(req.params.pet ?? '');

      const foods =
        category === 'safe'
          ? service.getSafeFoods(pet)
          : category === 'caution'
            ? service.getCautionFoods(pet)
            : service.getUnsafeFoods(pet);

      res.json({ pet, [`${category}Foods`]: foods, count: foods.length });
    });
  }

  router.get('/safe/:pet', listEndpoint('safe'));
  router.get('/caution/:pet', listEndpoint('caution'));
  router.get('/unsafe/:pet', listEndpoint('unsafe'));

  router.get(
    '/pets',
    asyncHandler(async (_req: Request, res: Response) => {
      const supportedPets = service.getSupportedPets();
      res.json({ supportedPets, count: supportedPets.length });
    }),
  );

  router.get(
    '/search',
    [
      query('q')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Query parameter "q" is required'),
    ],
    handleValidationErrors,
    asyncHandler(async (req: Request, res: Response) => {
      const q = String(req.query.q);
      const pet = req.query.pet ? String(req.query.pet) : undefined;

      const results = service.search(q, pet);

      res.json({ query: q, pet: pet ?? null, results, count: results.length });
    }),
  );

  router.get(
    '/stats',
    asyncHandler(async (_req: Request, res: Response) => {
      res.json({
        stats: service.getStats(),
        supportedPets: service.getSupportedPets(),
        totalEntries: service.totalEntries,
        timestamp: new Date().toISOString(),
      });
    }),
  );

  return router;
}
