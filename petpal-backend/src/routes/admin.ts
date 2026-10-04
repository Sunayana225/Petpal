import { Request, Response, Router } from 'express';

import { requireAdmin } from '../middleware/auth';
import type { AnswerStatus } from '../repositories/aiAnswerRepository';
import { answerCache } from '../services/answerCache';

const router = Router();

const STATUSES: AnswerStatus[] = ['pending', 'approved', 'rejected'];

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
