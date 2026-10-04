import { NextFunction, Request, Response, Router } from 'express';

import type { AnswerStatus } from '../repositories/aiAnswerRepository';
import { answerCache } from '../services/answerCache';

const router = Router();

const STATUSES: AnswerStatus[] = ['pending', 'approved', 'rejected'];

/**
 * Guard for the review queue.
 *
 * Mutating the safety dataset is an operational action, so it must never be
 * public. A logged-in admin (once auth lands) or the `ADMIN_TOKEN` is accepted;
 * with neither configured, every request is refused — it fails closed.
 */
function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.ADMIN_TOKEN;
  const provided = req.header('x-admin-token');
  const sessionUser = (req as Request & { user?: { role?: string } }).user;
  const isAdminSession = sessionUser?.role === 'admin';

  if (isAdminSession || (expected && provided === expected)) {
    next();
    return;
  }

  res.status(401).json({
    error: 'Unauthorized',
    message: 'A valid admin token or admin session is required.',
  });
}

/**
 * GET /api/admin/queue[?status=pending]
 * List captured remote answers with queue counts.
 */
router.get('/queue', requireAdmin, (req: Request, res: Response) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;

  if (status && !STATUSES.includes(status as AnswerStatus)) {
    res.status(400).json({
      error: 'Bad Request',
      message: `status must be one of: ${STATUSES.join(', ')}`,
    });
    return;
  }

  res.json({
    stats: answerCache.stats(),
    records: answerCache.list(status as AnswerStatus | undefined),
  });
});

/**
 * POST /api/admin/queue/:id/approve
 * Make a captured answer permanent (it stops expiring and is served to everyone).
 */
router.post('/queue/:id/approve', requireAdmin, (req: Request, res: Response) => {
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
