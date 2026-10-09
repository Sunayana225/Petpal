import { Request, Response, Router } from 'express';

import { asyncHandler } from '../../middleware/errorHandler';
import type { FoodSafetyService } from '../../services/foodSafetyService';
import { logger } from '../../utils/logger';
import { checkInput, parseCheck, type CheckInput } from './input';

/**
 * The check handler, built around an injected service.
 *
 * One handler serves `POST /check`, `GET /check` and the legacy `GET /api/check`
 * alias, so the three entry points cannot drift apart.
 */
export function createCheckHandler(service: FoodSafetyService) {
  return asyncHandler(async (req: Request, res: Response) => {
    // POST bodies use `pet`; the original API used `?animal=`.
    const { pet, food, mode } = (res.locals.checkInput as CheckInput | undefined) ?? parseCheck(req.method === 'POST' ? req.body : req.query, true);
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
    try { result = mode === 'local' ? service.checkLocal(pet, food) : await service.checkFoodSafety(pet, food, { apiKey, requestId, signal: controller.signal }); }
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

  router.post('/check', checkInput(), handler);
  router.get('/check', checkInput(), handler);
  router.all('/check', (_req, res) => res.set('Allow', 'GET, HEAD, POST, OPTIONS').status(405).json({ error: 'Method Not Allowed', message: 'Use GET or POST for checks.' }));

  return router;
}
