import { randomUUID } from 'crypto';

import { getDb, type Db } from '../db/database';

export interface UsageEventInput {
  keyId: string;
  method: string;
  path: string;
  status: number;
  latencyMs: number;
  source?: string | null;
}

export interface UsageEvent {
  id: string;
  keyId: string;
  ts: string;
  method: string;
  path: string;
  status: number;
  latencyMs: number;
  source: string | null;
}

export interface DailyCount {
  day: string;
  count: number;
}

interface UsageRow {
  id: string;
  key_id: string;
  ts: string;
  method: string;
  path: string;
  status: number;
  latency_ms: number;
  source: string | null;
}

function toEvent(row: UsageRow): UsageEvent {
  return {
    id: row.id,
    keyId: row.key_id,
    ts: row.ts,
    method: row.method,
    path: row.path,
    status: row.status,
    latencyMs: row.latency_ms,
    source: row.source,
  };
}

export class UsageRepository {
  constructor(private readonly db: Db) {}

  record(event: UsageEventInput): void {
    this.db
      .prepare(
        `INSERT INTO usage_events (id, key_id, ts, method, path, status, latency_ms, source)
         VALUES (@id, @keyId, @ts, @method, @path, @status, @latencyMs, @source)`,
      )
      .run({
        id: randomUUID(),
        keyId: event.keyId,
        ts: new Date().toISOString(),
        method: event.method,
        path: event.path,
        status: event.status,
        latencyMs: event.latencyMs,
        source: event.source ?? null,
      });
  }

  /** Number of calls for a key since an ISO timestamp — drives the quota check. */
  countSince(keyId: string, sinceIso: string): number {
    const row = this.db
      .prepare('SELECT COUNT(*) AS count FROM usage_events WHERE key_id = ? AND ts >= ?')
      .get(keyId, sinceIso) as { count: number };
    return row.count;
  }

  recentForKey(keyId: string, limit: number, offset = 0): UsageEvent[] {
    const rows = this.db
      .prepare('SELECT * FROM usage_events WHERE key_id = ? ORDER BY ts DESC, rowid DESC LIMIT ? OFFSET ?')
      .all(keyId, limit, offset) as UsageRow[];
    return rows.map(toEvent);
  }

  /** Per-day counts for a single key. */
  dailyForKey(keyId: string, sinceIso: string): DailyCount[] {
    return this.db
      .prepare(
        `SELECT substr(ts, 1, 10) AS day, COUNT(*) AS count
           FROM usage_events
          WHERE key_id = ? AND ts >= ?
          GROUP BY day
          ORDER BY day`,
      )
      .all(keyId, sinceIso) as DailyCount[];
  }

  /** Per-day counts across all of a user's keys. */
  dailyForUser(userId: string, sinceIso: string): DailyCount[] {
    return this.db
      .prepare(
        `SELECT substr(u.ts, 1, 10) AS day, COUNT(*) AS count
           FROM usage_events u
           JOIN api_keys k ON k.id = u.key_id
          WHERE k.user_id = ? AND u.ts >= ?
          GROUP BY day
          ORDER BY day`,
      )
      .all(userId, sinceIso) as DailyCount[];
  }

  recentForUser(userId: string, limit: number, offset = 0): UsageEvent[] {
    const rows = this.db
      .prepare(
        `SELECT u.* FROM usage_events u
           JOIN api_keys k ON k.id = u.key_id
          WHERE k.user_id = ?
          ORDER BY u.ts DESC, u.rowid DESC
          LIMIT ? OFFSET ?`,
      )
      .all(userId, limit, offset) as UsageRow[];
    return rows.map(toEvent);
  }

  totalsForUser(userId: string, sinceIso: string): { total: number; since: number } {
    const total = this.db
      .prepare(
        `SELECT COUNT(*) AS count FROM usage_events u
           JOIN api_keys k ON k.id = u.key_id WHERE k.user_id = ?`,
      )
      .get(userId) as { count: number };

    const since = this.db
      .prepare(
        `SELECT COUNT(*) AS count FROM usage_events u
           JOIN api_keys k ON k.id = u.key_id WHERE k.user_id = ? AND u.ts >= ?`,
      )
      .get(userId, sinceIso) as { count: number };

    return { total: total.count, since: since.count };
  }

  /** Admission and usage reservation happen under SQLite's writer lock. */
  reserve(key: { id: string; userId: string; quotaLimit: number | null }, since: string, dailySince: string, accountLimit: number, burstLimit: number, method: string, path: string): string | null {
    return this.db.transaction(() => {
      if (key.quotaLimit !== null && this.countSince(key.id, since) >= key.quotaLimit) return null;
      if (this.totalsForUser(key.userId, dailySince).since >= accountLimit) return null;
      if (this.countSince(key.id, new Date(Date.now() - 60000).toISOString()) >= burstLimit) return null;
      const id = randomUUID();
      this.db.prepare('INSERT INTO usage_events VALUES (?, ?, ?, ?, ?, 0, 0, NULL)').run(id, key.id, new Date().toISOString(), method, path);
      return id;
    }).immediate();
  }

  complete(id: string, status: number, latencyMs: number): void {
    this.db.prepare('UPDATE usage_events SET status = ?, latency_ms = ? WHERE id = ?').run(status, latencyMs, id);
  }
}

let singleton: UsageRepository | null = null;

/** Lazily-built shared repository — importing this module opens no database. */
export function usageRepository(): UsageRepository {
  if (!singleton) singleton = new UsageRepository(getDb());
  return singleton;
}
