import { NextFunction, Request, Response, Router } from 'express';

import { API_VERSION } from '../config/version';
import { requireAdmin } from '../middleware/auth';
import { requireApiKey, trackUsage } from '../middleware/apiKeyAuth';
import { healthCheck } from '../middleware/errorHandler';
import type { FoodSafetyService } from '../services/foodSafetyService';
import { SUPPORTED_PET_KEYS } from '../utils/normalization';
import { adminRouter } from './admin';
import { authRouter } from './auth';
import { createCheckHandler, createCheckRouter } from './foodSafety/check';
import { createDatasetRouter } from './foodSafety/dataset';
import { geminiRouter } from './gemini';
import { meRouter } from './keys';
import { monitoringRouter } from './monitoring';

/** What the route layer needs handed to it. */
export interface ApiDependencies {
  foodSafety: FoodSafetyService;
}

/**
 * The whole `/api` surface, assembled in one place so the *shape* of the API is
 * readable at a glance:
 *
 *  - `/api/food-safety/check`      public — what the web and mobile apps call
 *  - `/api/food-safety/*`          the dataset; API key required
 *  - `/api/v1/food-safety/*`       everything, keyed and usage-metered
 *  - `/api/auth`, `/api/me`, ...   the developer console
 *  - `/api/admin`, `/api/monitoring`  admin only
 */
export function createApiRouter({ foodSafety }: ApiDependencies): Router {
  const api = Router();

  // ---- public -----------------------------------------------------------------
  api.get('/health', healthCheck);
  api.get('/info', infoHandler);

  // ---- console & operations ---------------------------------------------------
  api.use('/auth', authRouter);
  api.use('/gemini', geminiRouter);
  api.use('/me', meRouter);
  api.use('/admin', adminRouter);
  // Metrics and process status disclose internals, so they require admin access.
  api.use('/monitoring', requireAdmin, monitoringRouter);

  // ---- food safety ------------------------------------------------------------
  const check = createCheckRouter(foodSafety);
  const dataset = createDatasetRouter(foodSafety);

  // Public path: the check is open, the dataset needs a key. (Requests to the
  // dataset are authenticated but not metered here — only `/v1` bills usage.)
  const publicFoodSafety = Router();
  publicFoodSafety.use(check);
  publicFoodSafety.use(requireApiKey, dataset);
  api.use('/food-safety', publicFoodSafety);

  // Versioned path: the check and the dataset, all keyed and metered once.
  const versioned = Router();
  versioned.use(check);
  versioned.use(dataset);
  api.use('/v1/food-safety', requireApiKey, trackUsage, versioned);

  // Legacy alias for `GET /api/check?animal=<pet>&food=<food>` — maps `animal`
  // onto `pet` and reuses the exact same handler, so behaviour cannot diverge.
  api.get(
    '/check',
    (req: Request, _res: Response, next: NextFunction) => {
      if (!req.query.pet && req.query.animal) {
        req.query.pet = String(req.query.animal);
      }
      next();
    },
    createCheckHandler(foodSafety),
  );

  return api;
}

/** Service info for the API root — the first thing anyone types in a browser. */
export function rootHandler(_req: Request, res: Response): void {
  res.json({
    name: 'PetPal Food Safety API',
    version: API_VERSION,
    status: 'running',
    description:
      'Instant, veterinary-sourced answers to "can my pet eat this?" across 10 species.',
    endpoints: {
      health: '/api/health',
      info: '/api/info',
      check: 'POST /api/food-safety/check',
      search: 'GET /api/food-safety/search?q=<food>&pet=<pet>',
      pets: '/api/food-safety/pets',
      stats: '/api/food-safety/stats',
    },
  });
}

function infoHandler(_req: Request, res: Response): void {
  res.json({
    name: 'PetPal Food Safety API',
    version: API_VERSION,
    description: 'API for checking pet food safety across multiple pet types',
    supportedPets: [...SUPPORTED_PET_KEYS],
    endpoints: {
      root: '/',
      health: '/api/health',
      info: '/api/info',
      foodSafety: 'POST /api/food-safety/check',
      foodSafetyGet: 'GET /api/food-safety/check?pet=<pet>&food=<food>',
      search: 'GET /api/food-safety/search?q=<food>',
      safeFoods: 'GET /api/food-safety/safe/:pet',
      cautionFoods: 'GET /api/food-safety/caution/:pet',
      unsafeFoods: 'GET /api/food-safety/unsafe/:pet',
      supportedPets: '/api/food-safety/pets',
      stats: '/api/food-safety/stats',
      metrics: '/api/monitoring/metrics',
      status: '/api/monitoring/status',
    },
  });
}
