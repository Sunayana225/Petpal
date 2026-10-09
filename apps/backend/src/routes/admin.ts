import { Request, Response, Router } from 'express';

import { requireAdmin } from '../middleware/auth';
import type { AnswerStatus } from '../repositories/aiAnswerRepository';
import { answerCache } from '../services/answerCache';
import { getDb } from '../db/database';
import { requireRecentAuth } from '../auth/security';
import { paging, pageOf, validate } from '../middleware/validation';
import { aiAnswerRepository } from '../repositories/aiAnswerRepository';
import { CustomError } from '../middleware/errorHandler';
import { currentUser } from '../middleware/auth';

const router = Router();
router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
router.patch('/users/:id', requireAdmin, (req, res, next) => {
  if (currentUser(req)) return requireRecentAuth(req, res, next);
  next();
}, (req, res) => {
  if (typeof req.body?.disabled !== 'boolean' || Object.keys(req.body).some((key) => key !== 'disabled')) {
    return res.status(400).json({ error: 'Bad Request', message: 'disabled must be a boolean.' });
  }
  const id = String(req.params.id);
  if (id === currentUser(req)?.id && req.body.disabled) return res.status(409).json({ error: 'Conflict', message: 'You cannot disable your own account.' });
  const changed = getDb().prepare('UPDATE users SET disabled = ? WHERE id = ?').run(req.body.disabled ? 1 : 0, id).changes;
  if (!changed) return res.status(404).json({ error: 'Not Found', message: 'No such user.' });
  if (req.body.disabled) getDb().prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
  res.json({ ok: true });
});

const STATUSES: AnswerStatus[] = ['pending', 'approved', 'rejected'];

/**
 * GET /api/admin/queue[?status=pending]
 * List captured remote answers with queue counts.
 */
router.get('/queue', requireAdmin, paging(), validate, (req: Request, res: Response) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  if (Object.keys(req.query).some(key => !['status', 'limit', 'offset'].includes(key))) throw new CustomError('Unsupported queue query field.', 400);
  const page = pageOf(req);

  if (status && !STATUSES.includes(status as AnswerStatus)) {
    res.status(400).json({
      error: 'Bad Request',
      message: `status must be one of: ${STATUSES.join(', ')}`,
    });
    return;
  }

  res.json({
    stats: answerCache.stats(),
    records: answerCache.list(status as AnswerStatus | undefined, page.limit, page.offset),
    pagination: { ...page, total: status ? answerCache.stats()[status as AnswerStatus] : answerCache.stats().total },
  });
});

/**
 * POST /api/admin/queue/:id/approve
 * Make a captured answer permanent (it stops expiring and is served to everyone).
 */
router.post('/queue/:id/approve', requireAdmin, (req: Request, res: Response) => {
  const existing = aiAnswerRepository().findById(String(req.params.id));
  if (existing?.safety === 'unknown' || existing?.status === 'cached') throw new CustomError('Unknown cached verdicts cannot be approved.', 409);
  const record = answerCache.approve(String(req.params.id));

  if (!record) {
    res.status(404).json({ error: 'Not Found', message: 'No such queue record.' });
    return;
  }

  res.json({ record });
});

/**
 * POST /api/admin/queue/:id/reject
 * Discard a captured answer so it is never served again.
 */
router.post('/queue/:id/reject', requireAdmin, (req: Request, res: Response) => {
  const record = answerCache.reject(String(req.params.id));

  if (!record) {
    res.status(404).json({ error: 'Not Found', message: 'No such queue record.' });
    return;
  }

  res.json({ record });
});

export { router as adminRouter };
