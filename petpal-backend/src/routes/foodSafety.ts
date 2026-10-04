import { Router, NextFunction, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';

import { asyncHandler } from '../middleware/errorHandler';
import { requireApiKey } from '../middleware/apiKeyAuth';
import { FoodSafetyService } from '../services/foodSafetyService';
import { logger } from '../utils/logger';

const router = Router();
const foodSafetyService = new FoodSafetyService();

/** Shared 404/500 JSON envelope for every validation failure. */
const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid input provided',
      details: errors.array(),
    });
    return;
  }
  next();
};

const validateCheckInput = [
  body('pet')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Pet type must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Pet type can only contain letters and spaces'),
  body('food')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Food name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-.,()']+$/)
    .withMessage('Food name contains invalid characters'),
];

/**
 * Shared by `POST /check`, `GET /check` and the legacy `GET /api/check` alias,
 * so all three accept the same rules and return the same envelope.
 */
export const checkFoodSafetyHandler = asyncHandler(
  async (req: Request, res: Response) => {
    // POST bodies use `pet`; the original API used `?animal=`.
    const pet = String(req.body?.pet ?? req.query?.pet ?? req.query?.animal ?? '').trim();
    const food = String(req.body?.food ?? req.query?.food ?? '').trim();
    // Optional BYOK: a caller's own Gemini key, used for this request only.
    // Deliberately never logged (and the logger redacts anything key-like).
    const apiKey = req.header('x-gemini-key')?.trim() || undefined;
    const requestId = (res.locals.requestId as string | undefined) ?? undefined;
    const log = logger.child({ requestId: requestId ?? null });
    const startTime = Date.now();

    log.debug('check requested', { pet, food, ip: req.ip, byok: Boolean(apiKey) });

    const result = await foodSafetyService.checkFoodSafety(pet, food, { apiKey, requestId });
    const duration = Date.now() - startTime;

    log.info('check completed', {
      pet,
      food,
      safety: result.safety,
      source: result.source,
      ms: duration,
    });

    res.json({
      ...result,
      requestId: res.locals.requestId,
      processingTime: `${duration}ms`,
    });
  },
);

/**
 * POST /api/food-safety/check
 * Check if a food is safe for a specific pet.
 */
router.post(
  '/check',
  validateCheckInput,
  handleValidationErrors,
  checkFoodSafetyHandler,
);

/**
 * GET /api/food-safety/check?pet=dog&food=chocolate
 * Convenience alias — handy for curl, browser testing and link sharing.
 */
router.get(
  '/check',
  [
    query('pet')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Query parameter "pet" is required'),
    query('food')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Query parameter "food" is required'),
  ],
  handleValidationErrors,
  checkFoodSafetyHandler,
);

type Category = 'safe' | 'caution' | 'unsafe';

/**
 * Factory for the three category-list endpoints. They used to be three near
 * identical copy-pasted handlers; one factory keeps the response shape
 * (`safeFoods` / `cautionFoods` / `unsafeFoods` + `count`) impossible to drift.
 */
function listEndpoint(category: Category) {
  return asyncHandler(async (req: Request, res: Response) => {
    const pet = String(req.params.pet ?? '');

    const foods =
      category === 'safe'
        ? foodSafetyService.getSafeFoods(pet)
        : category === 'caution'
          ? foodSafetyService.getCautionFoods(pet)
          : foodSafetyService.getUnsafeFoods(pet);

    res.json({ pet, [`${category}Foods`]: foods, count: foods.length });
  });
}

/**
 * Bulk / dataset endpoints. These expose the whole database, so they require an
 * API key *even on the public mount* — only `/check` stays open for the apps.
 */
/** GET /api/food-safety/safe/:pet */
router.get('/safe/:pet', requireApiKey, listEndpoint('safe'));

/** GET /api/food-safety/caution/:pet */
router.get('/caution/:pet', requireApiKey, listEndpoint('caution'));

/** GET /api/food-safety/unsafe/:pet */
router.get('/unsafe/:pet', requireApiKey, listEndpoint('unsafe'));

/** GET /api/food-safety/pets */
router.get(
  '/pets',
  requireApiKey,
  asyncHandler(async (_req: Request, res: Response) => {
    const supportedPets = foodSafetyService.getSupportedPets();
    res.json({ supportedPets, count: supportedPets.length });
  }),
);

/** GET /api/food-safety/search?q=apple[&pet=dog] */
router.get(
  '/search',
  requireApiKey,
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

    const results = foodSafetyService.search(q, pet);

    res.json({ query: q, pet: pet ?? null, results, count: results.length });
  }),
);

/** GET /api/food-safety/stats — database coverage per species. */
router.get(
  '/stats',
  requireApiKey,
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({
      stats: foodSafetyService.getStats(),
      supportedPets: foodSafetyService.getSupportedPets(),
      totalEntries: foodSafetyService.totalEntries,
      timestamp: new Date().toISOString(),
    });
  }),
);

export { router as foodSafetyRouter };
