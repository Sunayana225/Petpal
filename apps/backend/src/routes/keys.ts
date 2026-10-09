import { Router, type Request, type Response } from 'express';
import { body } from 'express-validator';

import { currentUser, requireAuth } from '../middleware/auth';
import type { QuotaWindow } from '../repositories/apiKeyRepository';
import { usageRepository } from '../repositories/usageRepository';
import { apiKeyService, windowStartIso } from '../services/apiKeyService';
import { validate as handleValidation, keyShape, keyOptions, paging, pageOf, usageRange } from '../middleware/validation';
import { apiKeyRepository } from '../repositories/apiKeyRepository';
import { requireRecentAuth } from '../auth/security';
import { getDb } from '../db/database';

const router = Router();

// Everything here requires a signed-in user.
router.use(requireAuth);
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});


function quotaFrom(bodyValue: unknown): number | null | undefined {
  if (bodyValue === undefined) return undefined;
  if (bodyValue === null) return null;
  return Number(bodyValue);
}

/** GET /api/me/keys — the caller's active keys, each with its current usage. */
router.get('/keys', paging(), handleValidation, (req: Request, res: Response) => {
  const user = currentUser(req)!;
  const service = apiKeyService();

  const page = pageOf(req);
  const keys = apiKeyRepository().page(user.id, page.limit + 1, page.offset).map((key) => ({
    ...key,
    // Live metrics so the console can show calls used / remaining per key.
    usage: service.quotaStatus(key),
  }));

  res.json({ keys: keys.slice(0, page.limit), pagination: { ...page, hasMore: keys.length > page.limit } });
});

/** GET /api/me/keys/:id/usage — detailed usage for one key. */
router.get('/keys/:id/usage', usageRange(), paging(), handleValidation, (req: Request, res: Response) => {
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
    recent: usage.recentForKey(key.id, pageOf(req).limit, pageOf(req).offset),
    pagination: pageOf(req),
  });
});

/** POST /api/me/keys — create a key; the raw value is returned once. */
router.post(
  '/keys',
  requireRecentAuth,
  keyShape,
  [
    body('name').isString().bail().trim().isLength({ min: 1, max: 60 }).withMessage('name is required (max 60 chars)'),
    ...keyOptions(),
  ],
  handleValidation,
  (req: Request, res: Response) => {
    const user = currentUser(req)!;
    const { key, rawKey } = apiKeyService().create(user.id, String(req.body.name), {
      quotaLimit: quotaFrom(req.body.quotaLimit),
      quotaWindow: req.body.quotaWindow as QuotaWindow | undefined,
      scope: req.body.scope,
      ipAllowlist: req.body.ipAllowlist,
      expiresAt: req.body.expiresAt,
    });
    res.status(201).json({ key, rawKey });
  },
);

/** PATCH /api/me/keys/:id — rename, enable/disable, change quota. */
router.patch(
  '/keys/:id',
  requireRecentAuth,
  keyShape,
  [
    body('name').optional().isString().bail().trim().isLength({ min: 1, max: 60 }),
    body('enabled').optional().custom((value: unknown) => typeof value === 'boolean'),
    ...keyOptions(),
  ],
  handleValidation,
  (req: Request, res: Response) => {
    const user = currentUser(req)!;
    const updated = apiKeyService().update(user.id, String(req.params.id), {
      name: req.body.name,
      enabled: req.body.enabled,
      quotaLimit: quotaFrom(req.body.quotaLimit),
      quotaWindow: req.body.quotaWindow as QuotaWindow | undefined,
      scope: req.body.scope,
      ipAllowlist: req.body.ipAllowlist,
      expiresAt: req.body.expiresAt,
    });

    if (!updated) {
      res.status(404).json({ error: 'Not Found', message: 'No such key.' });
      return;
    }
    res.json({ key: updated });
  },
);

/** DELETE /api/me/keys/:id — revoke immediately. */
router.delete('/keys/:id', requireRecentAuth, (req: Request, res: Response) => {
  const user = currentUser(req)!;
  const revoked = apiKeyService().revoke(user.id, String(req.params.id));

  if (!revoked) {
    res.status(404).json({ error: 'Not Found', message: 'No such key.' });
    return;
  }
  res.json({ key: revoked });
});

/** GET /api/me/usage — totals, per-day counts and recent calls across keys. */
router.get('/usage', usageRange(), paging(), handleValidation, (req: Request, res: Response) => {
  const user = currentUser(req)!;
  const since = typeof req.query.since === 'string' ? req.query.since : windowStartIso('month');
  const usage = usageRepository();

  res.json({
    totals: usage.totalsForUser(user.id, since),
    daily: usage.dailyForUser(user.id, since),
    recent: usage.recentForUser(user.id, pageOf(req).limit, pageOf(req).offset),
    pagination: pageOf(req),
  });
});

router.post('/keys/:id/rotate', requireRecentAuth,
  body('graceSeconds').optional().isInt({ min: 0, max: 86400 }), handleValidation, (req: Request, res: Response) => {
    const result = apiKeyService().rotate(currentUser(req)!.id, String(req.params.id), Number(req.body?.graceSeconds ?? 300));
    if (!result) return res.status(404).json({ error: 'Not Found', message: 'No active key.' });
    res.status(201).json(result);
  });
router.get('/audit', paging(), handleValidation, (req: Request, res: Response) => {
  const page = pageOf(req);
  res.json({ events: getDb().prepare('SELECT action, resource_id AS resourceId, ts FROM audit_events WHERE user_id = ? ORDER BY ts DESC, rowid DESC LIMIT ? OFFSET ?').all(currentUser(req)!.id, page.limit, page.offset), pagination: page });
});

export { router as meRouter };
