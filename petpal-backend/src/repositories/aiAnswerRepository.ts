import { randomUUID } from 'crypto';

import { getDb, type Db } from '../db/database';
import type { FoodSafetyResult, SafetyLevel } from '../types/foodSafety';

/**
 * Durable store of every answer produced by a remote source.
 *
 * Two jobs in one table:
 *  - **cache** — the same `pet | food` is never sent to Gemini twice, even
 *    across restarts;
 *  - **review queue** — a real AI verdict is `pending` until a human approves it.
 *
 * `cached` marks answers (e.g. `unknown`) that are worth remembering but are not
 * human-reviewable.
 */

export type AnswerStatus = 'pending' | 'approved' | 'rejected' | 'cached';

export interface StoredAnswer {
  id: string;
  pet: string;
  food: string;
  safety: SafetyLevel;
  payload: FoodSafetyResult;
  source: string;
  status: AnswerStatus;
  createdAt: string;
  expiresAt: number | null;
}

export interface SaveAnswerInput {
  pet: string;
  food: string;
  safety: SafetyLevel;
  payload: FoodSafetyResult;
  source: string;
  status: AnswerStatus;
  /** Lifetime in ms; `null` means it never expires. */
  ttlMs: number | null;
}

export interface AnswerStats {
  pending: number;
  approved: number;
  rejected: number;
  cached: number;
  total: number;
}

interface AnswerRow {
  id: string;
  pet: string;
  food: string;
  safety: SafetyLevel;
  payload: string;
  source: string;
  status: AnswerStatus;
  created_at: string;
  expires_at: number | null;
}

function toStored(row: AnswerRow): StoredAnswer {
  return {
    id: row.id,
    pet: row.pet,
    food: row.food,
    safety: row.safety,
    payload: JSON.parse(row.payload) as FoodSafetyResult,
    source: row.source,
    status: row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

export class AiAnswerRepository {
  constructor(private readonly db: Db) {}

  /**
   * Insert or refresh the answer for a `pet | food`. An already-`approved`
   * answer is never downgraded by a later capture.
   */
  save(input: SaveAnswerInput): StoredAnswer {
    const expiresAt = input.ttlMs === null ? null : Date.now() + input.ttlMs;

    this.db
      .prepare(
        `INSERT INTO ai_answers (id, pet, food, safety, payload, source, status, created_at, expires_at)
         VALUES (@id, @pet, @food, @safety, @payload, @source, @status, @createdAt, @expiresAt)
         ON CONFLICT(pet, food) DO UPDATE SET
           safety     = excluded.safety,
           payload    = excluded.payload,
           source     = excluded.source,
           status     = excluded.status,
           expires_at = excluded.expires_at
         WHERE ai_answers.status <> 'approved'`,
      )
      .run({
        id: randomUUID(),
        pet: input.pet,
        food: input.food,
        safety: input.safety,
        payload: JSON.stringify(input.payload),
        source: input.source,
        status: input.status,
        createdAt: new Date().toISOString(),
        expiresAt,
      });

    return this.find(input.pet, input.food)!;
  }

  /** Look up a live (non-expired) answer. */
  find(pet: string, food: string): StoredAnswer | null {
    const row = this.db
      .prepare('SELECT * FROM ai_answers WHERE pet = ? AND food = ?')
      .get(pet, food) as AnswerRow | undefined;
    if (!row) return null;
    if (row.expires_at !== null && row.expires_at <= Date.now()) return null;
    return toStored(row);
  }

  findById(id: string): StoredAnswer | null {
    const row = this.db.prepare('SELECT * FROM ai_answers WHERE id = ?').get(id) as
      | AnswerRow
      | undefined;
    return row ? toStored(row) : null;
  }

  list(status?: AnswerStatus): StoredAnswer[] {
    const rows = status
      ? (this.db
          .prepare('SELECT * FROM ai_answers WHERE status = ? ORDER BY created_at DESC')
          .all(status) as AnswerRow[])
      : (this.db.prepare('SELECT * FROM ai_answers ORDER BY created_at DESC').all() as AnswerRow[]);
    return rows.map(toStored);
  }

  /** Approving makes an answer permanent (no expiry); rejecting keeps its TTL. */
  setStatus(id: string, status: AnswerStatus): StoredAnswer | null {
    const existing = this.findById(id);
    if (!existing) return null;

    this.db
      .prepare('UPDATE ai_answers SET status = ?, expires_at = ? WHERE id = ?')
      .run(status, status === 'approved' ? null : existing.expiresAt, id);

    return this.findById(id);
  }

  stats(): AnswerStats {
    const rows = this.db
      .prepare('SELECT status, COUNT(*) AS count FROM ai_answers GROUP BY status')
      .all() as { status: AnswerStatus; count: number }[];

    const stats: AnswerStats = { pending: 0, approved: 0, rejected: 0, cached: 0, total: 0 };
    for (const row of rows) {
      stats[row.status] = row.count;
      stats.total += row.count;
    }
    return stats;
  }

  /** Remove expired rows; returns how many were deleted. */
  pruneExpired(): number {
    const result = this.db
      .prepare('DELETE FROM ai_answers WHERE expires_at IS NOT NULL AND expires_at <= ?')
      .run(Date.now());
    return result.changes;
  }
}

let singleton: AiAnswerRepository | null = null;

/** Lazily-built shared repository — importing this module opens no database. */
export function aiAnswerRepository(): AiAnswerRepository {
  if (!singleton) singleton = new AiAnswerRepository(getDb());
  return singleton;
}
