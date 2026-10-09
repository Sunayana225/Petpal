import { NextFunction, Request, Response, Router } from 'express';
import { body, query, validationResult } from 'express-validator';

import { asyncHandler } from '../../middleware/errorHandler';
import type { FoodSafetyService } from '../../services/foodSafetyService';
import { logger } from '../../utils/logger';

/** One response envelope for every validation failure. */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
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

/** Body rules for `POST /check`. */
export const validateCheckBody = [
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

/** Query rules for `GET /check` and the legacy `GET /api/check` alias. */
export const validateCheckQuery = [
  query('pet')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Query parameter "pet" is required'),
  query('food')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Query parameter "food" is required'),
];

/**
 * The check handler, built around an injected service.
 *
 * One handler serves `POST /check`, `GET /check` and the legacy `GET /api/check`
 * alias, so the three entry points cannot drift apart.
 */
export function createCheckHandler(service: FoodSafetyService) {
  return asyncHandler(async (req: Request, res: Response) => {
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

    const controller = new AbortController();
    const disconnect = () => { if (!res.writableFinished) controller.abort(); };
    res.once('close', disconnect);
    let result;
    try { result = await service.checkFoodSafety(pet, food, { apiKey, requestId, signal: controller.signal }); }
    finally { res.removeListener('close', disconnect); }
    if (controller.signal.aborted) return;
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
  });
}

/**
 * `POST /check` and `GET /check` — the only food-safety routes that are public.
 */
export function createCheckRouter(service: FoodSafetyService): Router {
  const router = Router();
  const handler = createCheckHandler(service);

  router.post('/check', validateCheckBody, handleValidationErrors, handler);
  router.get('/check', validateCheckQuery, handleValidationErrors, handler);

  return router;
}
