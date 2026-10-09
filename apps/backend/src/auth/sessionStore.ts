import { Store, type SessionData } from 'express-session';
import type { Db } from '../db/database';
import { env } from '../config/env';

export class SqliteSessionStore extends Store {
  private lastCleanup = 0;
  constructor(private readonly db: Db) { super(); }
  private expiryOf(session: SessionData): number {
    const absolute = session.authenticatedAt ? session.authenticatedAt + env.sessionAbsoluteMs : Infinity;
    const idle = session.lastActiveAt ? session.lastActiveAt + env.sessionIdleMs : Infinity;
    const cookie = session.cookie?.expires ? new Date(session.cookie.expires).getTime() : Date.now() + env.sessionAbsoluteMs;
    return Math.min(absolute, idle, cookie);
  }
  private cleanup(): void {
    if (Date.now() - this.lastCleanup < 60000) return;
    this.db.prepare('DELETE FROM sessions WHERE sid IN (SELECT sid FROM sessions WHERE expires_at <= ? LIMIT 500)').run(Date.now());
    this.db.prepare('DELETE FROM session_revocations WHERE sid IN (SELECT sid FROM session_revocations WHERE expires_at <= ? LIMIT 500)').run(Date.now());
    this.lastCleanup = Date.now();
  }
  get(sid: string, callback: (err?: unknown, session?: SessionData | null) => void): void {
    let result: SessionData | null = null;
    try {
      this.cleanup();
      const row = this.db.prepare('SELECT data, expires_at FROM sessions WHERE sid = ?').get(sid) as { data: string; expires_at: number } | undefined;
      if (row && row.expires_at > Date.now()) result = JSON.parse(row.data) as SessionData;
      else if (row) this.db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
    } catch (error) { callback(error); return; }
    callback(null, result);
  }
  set(sid: string, session: SessionData, callback?: (err?: unknown) => void): void {
    try {
      this.cleanup();
      const userId = (session as SessionData & { passport?: { user?: unknown } }).passport?.user;
      const revoked = this.db.prepare('SELECT sid FROM session_revocations WHERE sid = ? AND expires_at > ?').get(sid, Date.now());
      const disabled = typeof userId === 'string' && this.db.prepare('SELECT id FROM users WHERE id = ? AND disabled = 1').get(userId);
      if (!revoked && !disabled) this.db.prepare(`INSERT INTO sessions VALUES (?, ?, ?, ?)
        ON CONFLICT(sid) DO UPDATE SET user_id=excluded.user_id, data=excluded.data, expires_at=excluded.expires_at`)
        .run(sid, typeof userId === 'string' ? userId : null, JSON.stringify(session), this.expiryOf(session));
    } catch (error) { callback?.(error); return; }
    callback?.();
  }
  destroy(sid: string, callback?: (err?: unknown) => void): void {
    try {
      this.db.transaction(() => {
        this.db.prepare('INSERT OR REPLACE INTO session_revocations VALUES (?, ?)').run(sid, Date.now() + env.sessionAbsoluteMs);
        this.db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
      }).immediate();
    }
    catch (error) { callback?.(error); return; }
    callback?.();
  }
  touch(sid: string, session: SessionData, callback?: (err?: unknown) => void): void {
    try { this.db.prepare('UPDATE sessions SET data = ?, expires_at = ? WHERE sid = ?').run(JSON.stringify(session), this.expiryOf(session), sid); }
    catch (error) { callback?.(error); return; }
    callback?.();
  }
  length(callback: (err: unknown, length?: number) => void): void {
    let count: number;
    try { count = (this.db.prepare('SELECT COUNT(*) AS count FROM sessions WHERE expires_at > ?').get(Date.now()) as { count: number }).count; }
    catch (error) { callback(error); return; }
    callback(null, count);
  }
  clear(callback?: (err?: unknown) => void): void {
    try { this.db.prepare('DELETE FROM sessions').run(); }
    catch (error) { callback?.(error); return; }
    callback?.();
  }
}
