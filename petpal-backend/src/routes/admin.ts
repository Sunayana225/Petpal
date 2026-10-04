import { NextFunction, Request, Response, Router } from 'express';

import { aiLearningStore, type ReviewStatus } from '../services/aiLearningStore';
import { foodSafetyRepository } from '../services/foodSafetyRepository';

const router = Router();

const STATUSES: ReviewStatus[] = ['pending', 'approved', 'rejected'];

/**
 * Guard for the review queue.
 *
 * Mutating the safety dataset is an operational action, so it must never be
 * public. Without `ADMIN_TOKEN` configured, every request is refused — a
 * missing secret fails closed rather than open.
 */
function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.ADMIN_TOKEN;
  const provided = req.header('x-admin-token');

  if (!expected || provided !== expected) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'A valid admin token is required (send it as x-admin-token).',
    });
    return;
  }
  next();
}

/**
 * GET /api/admin/queue[?status=pending]
 * List captured AI answers, newest state first, with queue counts.
 */
router.get('/queue', requireAdmin, (req: Request, res: Response) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;

  if (status && !STATUSES.includes(status as ReviewStatus)) {
    res.status(400).json({
      error: 'Bad Request',
      message: `status must be one of: ${STATUSES.join(', ')}`,
    });
    return;
  }

  res.json({
    stats: aiLearningStore.stats(),
    records: aiLearningStore.list(status as ReviewStatus | undefined),
  });
});

/**
 * POST /api/admin/queue/:id/approve
 * Promote a pending AI answer into the live dataset. Rebuilds the in-memory
 * index so the change takes effect without a restart.
 */
router.post('/queue/:id/approve', requireAdmin, (req: Request, res: Response) => {
  const record = aiLearningStore.approve(String(req.params.id));

  if (!record) {
    res.status(404).json({ error: 'Not Found', message: 'No such queue record.' });
    return;
  }

  foodSafetyRepository.rebuild();
  res.json({ record });
});

/**
 * POST /api/admin/queue/:id/reject
 * Discard a captured AI answer so it never reaches the dataset.
 */
router.post('/queue/:id/reject', requireAdmin, (req: Request, res: Response) => {
  const record = aiLearningStore.reject(String(req.params.id));

  if (!record) {
    res.status(404).json({ error: 'Not Found', message: 'No such queue record.' });
    return;
  }

  res.json({ record });
});

export { router as adminRouter };
