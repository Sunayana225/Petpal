import { Store, type SessionData } from 'express-session';

import type { Db } from '../db/database';

interface SessionRow {
  sid: string;
  user_id: string | null;
  data: string;
  expires_at: number;
}

const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * An `express-session` store backed by the same SQLite database as everything
 * else — no second native driver, and sessions survive a restart.
 */
export class SqliteSessionStore extends Store {
  constructor(private readonly db: Db) {
    super();
  }

  private expiryOf(session: SessionData): number {
    const expires = session.cookie?.expires;
    return expires ? new Date(expires).getTime() : Date.now() + DEFAULT_TTL_MS;
  }

  get(sid: string, callback: (err?: unknown, session?: SessionData | null) => void): void {
    const row = this.db.prepare('SELECT * FROM sessions WHERE sid = ?').get(sid) as
      | SessionRow
      | undefined;

    if (!row) {
      callback(null, null);
      return;
    }
    if (row.expires_at <= Date.now()) {
      this.db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
      callback(null, null);
      return;
    }

    try {
      callback(null, JSON.parse(row.data) as SessionData);
    } catch (error) {
      callback(error);
    }
  }

  set(sid: string, session: SessionData, callback?: (err?: unknown) => void): void {
    const rawUserId = (session as SessionData & { userId?: unknown }).userId;
    const userId = typeof rawUserId === 'string' ? rawUserId : null;
    this.db
      .prepare(
        `INSERT INTO sessions (sid, user_id, data, expires_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(sid) DO UPDATE SET data = excluded.data, user_id = excluded.user_id, expires_at = excluded.expires_at`,
      )
      .run(sid, userId, JSON.stringify(session), this.expiryOf(session));
    callback?.();
  }

  destroy(sid: string, callback?: (err?: unknown) => void): void {
    this.db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
    callback?.();
  }

  touch(sid: string, session: SessionData, callback?: () => void): void {
    this.db
      .prepare('UPDATE sessions SET expires_at = ? WHERE sid = ?')
      .run(this.expiryOf(session), sid);
    callback?.();
  }

  length(callback: (err: unknown, length: number) => void): void {
    const row = this.db.prepare('SELECT COUNT(*) AS count FROM sessions').get() as { count: number };
    callback(null, row.count);
  }

  clear(callback?: (err?: unknown) => void): void {
    this.db.prepare('DELETE FROM sessions').run();
    callback?.();
  }
}
