import { NextFunction, Router, type Request, type Response } from 'express';
import { body, validationResult } from 'express-validator';

import { currentUser, requireAuth } from '../middleware/auth';
import type { QuotaWindow } from '../repositories/apiKeyRepository';
import { usageRepository } from '../repositories/usageRepository';
import { apiKeyService, windowStartIso } from '../services/apiKeyService';

const router = Router();

// Everything here requires a signed-in user.
router.use(requireAuth);

function handleValidation(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation Error', message: 'Invalid input provided', details: errors.array() });
    return;
  }
  next();
}

function quotaFrom(bodyValue: unknown): number | null | undefined {
  if (bodyValue === undefined) return undefined;
  if (bodyValue === null) return null;
  return Number(bodyValue);
}

/** GET /api/me/keys — the caller's active keys, each with its current usage. */
router.get('/keys', (req: Request, res: Response) => {
  const user = currentUser(req)!;
  const service = apiKeyService();

  const keys = service.list(user.id).map((key) => ({
    ...key,
    // Live metrics so the console can show calls used / remaining per key.
    usage: service.quotaStatus(key),
  }));

  res.json({ keys });
});

/** GET /api/me/keys/:id/usage — detailed usage for one key. */
router.get('/keys/:id/usage', (req: Request, res: Response) => {
  const user = currentUser(req)!;
  const key = apiKeyService()
    .list(user.id)
    .find((candidate) => candidate.id === String(req.params.id));

  if (!key) {
    res.status(404).json({ error: 'Not Found', message: 'No such key.' });
    return;
  }

  const since = typeof req.query.since === 'string' ? req.query.since : windowStartIso('month');
  const usage = usageRepository();

  res.json({
    key,
    quota: apiKeyService().quotaStatus(key),
    total: usage.countSince(key.id, new Date(0).toISOString()),
    daily: usage.dailyForKey(key.id, since),
    recent: usage.recentForKey(key.id, 50),
  });
});

/** POST /api/me/keys — create a key; the raw value is returned once. */
router.post(
  '/keys',
  [
    body('name').trim().isLength({ min: 1, max: 60 }).withMessage('name is required (max 60 chars)'),
    body('quotaLimit').optional({ nullable: true }).isInt({ min: 0 }),
    body('quotaWindow').optional().isIn(['day', 'month', 'total']),
  ],
  handleValidation,
  (req: Request, res: Response) => {
    const user = currentUser(req)!;
    const { key, rawKey } = apiKeyService().create(user.id, String(req.body.name), {
      quotaLimit: quotaFrom(req.body.quotaLimit),
      quotaWindow: req.body.quotaWindow as QuotaWindow | undefined,
    });
    res.status(201).json({ key, rawKey });
  },
);

/** PATCH /api/me/keys/:id — rename, enable/disable, change quota. */
router.patch(
  '/keys/:id',
  [
    body('name').optional().trim().isLength({ min: 1, max: 60 }),
    body('enabled').optional().isBoolean(),
    body('quotaLimit').optional({ nullable: true }).isInt({ min: 0 }),
    body('quotaWindow').optional().isIn(['day', 'month', 'total']),
  ],
  handleValidation,
  (req: Request, res: Response) => {
    const user = currentUser(req)!;
    const updated = apiKeyService().update(user.id, String(req.params.id), {
      name: req.body.name,
      enabled: req.body.enabled,
      quotaLimit: quotaFrom(req.body.quotaLimit),
      quotaWindow: req.body.quotaWindow as QuotaWindow | undefined,
    });

    if (!updated) {
      res.status(404).json({ error: 'Not Found', message: 'No such key.' });
      return;
    }
    res.json({ key: updated });
  },
);

/** DELETE /api/me/keys/:id — revoke immediately. */
router.delete('/keys/:id', (req: Request, res: Response) => {
  const user = currentUser(req)!;
  const revoked = apiKeyService().revoke(user.id, String(req.params.id));

  if (!revoked) {
    res.status(404).json({ error: 'Not Found', message: 'No such key.' });
    return;
  }
  res.json({ key: revoked });
});

/** GET /api/me/usage — totals, per-day counts and recent calls across keys. */
router.get('/usage', (req: Request, res: Response) => {
  const user = currentUser(req)!;
  const since = typeof req.query.since === 'string' ? req.query.since : windowStartIso('month');
  const usage = usageRepository();

  res.json({
    totals: usage.totalsForUser(user.id, since),
    daily: usage.dailyForUser(user.id, since),
    recent: usage.recentForUser(user.id, 50),
  });
});

export { router as meRouter };
