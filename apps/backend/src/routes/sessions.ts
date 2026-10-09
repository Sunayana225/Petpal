import { Router } from 'express';
import { createHash } from 'crypto';
import { getDb } from '../db/database';
import { currentUser, requireAuth } from '../middleware/auth';
import { requireRecentAuth } from '../auth/security';
import { env } from '../config/env';

const router = Router();
router.use(requireAuth);
router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
const publicId = (sid: string) => createHash('sha256').update(sid).digest('hex');

router.get('/', (req, res) => {
  const rows = getDb().prepare('SELECT sid, data, expires_at FROM sessions WHERE user_id = ? AND expires_at > ? ORDER BY expires_at DESC LIMIT 100')
    .all(currentUser(req)!.id, Date.now()) as { sid: string; data: string; expires_at: number }[];
  res.json({ sessions: rows.map((row) => {
    const data = JSON.parse(row.data) as { authenticatedAt?: number; lastActiveAt?: number };
    return { id: publicId(row.sid), current: row.sid === req.sessionID, authenticatedAt: data.authenticatedAt, lastActiveAt: data.lastActiveAt, expiresAt: row.expires_at };
  }) });
});

router.delete('/', requireRecentAuth, (req, res, next) => {
  getDb().transaction(() => {
    getDb().prepare('INSERT OR REPLACE INTO session_revocations SELECT sid, ? FROM sessions WHERE user_id = ?').run(Date.now() + env.sessionAbsoluteMs, currentUser(req)!.id);
    getDb().prepare('DELETE FROM sessions WHERE user_id = ?').run(currentUser(req)!.id);
  }).immediate();
  req.session.destroy((error) => {
    if (error) return next(error);
    res.json({ ok: true });
  });
});

router.delete('/:id', requireRecentAuth, (req, res, next) => {
  const rows = getDb().prepare('SELECT sid FROM sessions WHERE user_id = ?').all(currentUser(req)!.id) as { sid: string }[];
  const target = rows.find((row) => publicId(row.sid) === req.params.id);
  if (!target) return res.status(404).json({ error: 'Not Found', message: 'No such session.' });
  getDb().transaction(() => {
    getDb().prepare('INSERT OR REPLACE INTO session_revocations VALUES (?, ?)').run(target.sid, Date.now() + env.sessionAbsoluteMs);
    getDb().prepare('DELETE FROM sessions WHERE sid = ? AND user_id = ?').run(target.sid, currentUser(req)!.id);
  }).immediate();
  if (target.sid === req.sessionID) {
    req.session.destroy((error) => { if (error) return next(error); res.json({ ok: true }); });
  } else res.json({ ok: true });
});

export { router as sessionsRouter };
