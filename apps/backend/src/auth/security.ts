import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import 'express-session';
import { env } from '../config/env';
import { getDb } from '../db/database';
import type { Metadata, StateStoreStoreCallback, StateStoreVerifyCallback } from 'passport-oauth2';

declare module 'express-session' {
  interface SessionData {
    authenticatedAt?: number;
    lastActiveAt?: number;
    csrfToken?: string;
    oauthStarted?: boolean;
    oauthReturnTo?: string;
    oauthLinkUserId?: string;
  }
}

export function stampLogin(req: Request): void {
  req.session.authenticatedAt = Date.now();
  req.session.lastActiveAt = Date.now();
  req.session.csrfToken = randomBytes(32).toString('hex');
}

export function enforceSession(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) return next();
  const now = Date.now();
  if (!req.session.authenticatedAt || now - req.session.authenticatedAt > env.sessionAbsoluteMs ||
      !req.session.lastActiveAt || now - req.session.lastActiveAt > env.sessionIdleMs) {
    req.session.destroy((error) => {
      if (error) return next(error);
      req.user = undefined;
      res.status(401).json({ error: 'Unauthorized', message: 'Session expired. Please sign in again.' });
    });
    return;
  }
  req.session.lastActiveAt = now;
  next();
}

export function requireRecentAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || !req.session.authenticatedAt || Date.now() - req.session.authenticatedAt > env.reauthMs) {
    res.status(403).json({ error: 'Forbidden', errorCode: 'REAUTH_REQUIRED', message: 'Sign in again to make this change.' });
    return;
  }
  next();
}

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || !req.user) return next();
  // Bearer API clients have no authenticated cookie user and remain exempt.
  // The local-only login shortcut deliberately supports identity switching.
  if (req.path === '/auth/dev-login') return next();
  const supplied = req.header('x-csrf-token');
  const expected = req.session.csrfToken;
  if (!supplied || !expected || !timingSafeEqual(
    createHash('sha256').update(supplied).digest(), createHash('sha256').update(expected).digest(),
  )) {
    res.status(403).json({ error: 'Forbidden', errorCode: 'CSRF_INVALID', message: 'Refresh your session and retry.' });
    return;
  }
  next();
}

/** One-use state records support concurrent OAuth tabs without session overwrites. */
export class OAuthStateStore {
  constructor(private readonly provider: string) {}

  store(req: Request, callback: StateStoreStoreCallback): void;
  store(req: Request, meta: Metadata, callback: StateStoreStoreCallback): void;
  store(req: Request, metaOrCallback: Metadata | StateStoreStoreCallback, lastCallback?: StateStoreStoreCallback): void {
    const callback = typeof metaOrCallback === 'function' ? metaOrCallback : lastCallback!;
    try {
      const db = getDb();
      db.prepare('DELETE FROM oauth_transactions WHERE expires_at <= ?').run(Date.now());
      const state = randomBytes(32).toString('hex');
      const returnTo = typeof req.query.next === 'string' ? req.query.next : null;
      const linkUserId = req.query.link === '1' && req.user ? (req.user as { id: string }).id : null;
      db.prepare(`INSERT INTO oauth_transactions VALUES (?, ?, ?, ?, ?, ?)`)
        .run(state, req.sessionID, this.provider, returnTo, linkUserId, Date.now() + env.oauthTransactionMs);
      req.session.oauthStarted = true;
      callback(null, state);
    } catch (error) { callback(error instanceof Error ? error : new Error('OAuth state storage failed'), null); }
  }

  verify(req: Request, state: string, callback: StateStoreVerifyCallback): void;
  verify(req: Request, state: string, meta: Metadata, callback: StateStoreVerifyCallback): void;
  verify(req: Request, state: string, metaOrCallback: Metadata | StateStoreVerifyCallback, lastCallback?: StateStoreVerifyCallback): void {
    const callback = typeof metaOrCallback === 'function' ? metaOrCallback : lastCallback!;
    try {
      const db = getDb();
      const row = db.transaction(() => {
        const found = db.prepare('SELECT * FROM oauth_transactions WHERE state = ? AND sid = ? AND provider = ?')
          .get(state ?? '', req.sessionID, this.provider) as { expires_at: number; return_to: string | null; link_user_id: string | null } | undefined;
        if (found) db.prepare('DELETE FROM oauth_transactions WHERE state = ?').run(state);
        return found;
      }).immediate();
      if (!row || row.expires_at <= Date.now()) return callback(null, false, { message: 'Invalid or expired authorization state.' });
      req.session.oauthReturnTo = row.return_to ?? undefined;
      req.session.oauthLinkUserId = row.link_user_id ?? undefined;
      callback(null, true, undefined);
    } catch (error) { callback(error instanceof Error ? error : new Error('OAuth state verification failed'), false, undefined); }
  }
}
