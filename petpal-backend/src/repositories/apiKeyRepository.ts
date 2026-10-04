import { randomUUID } from 'crypto';

import type { Db } from '../db/database';

export type QuotaWindow = 'day' | 'month' | 'total';

/** An API key as exposed to its owner — never carries the hash. */
export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  prefix: string;
  last4: string;
  enabled: boolean;
  scope: string;
  /** `null` means unlimited. */
  quotaLimit: number | null;
  quotaWindow: QuotaWindow;
  ipAllowlist: string[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface ApiKeyWithHash extends ApiKey {
  keyHash: string;
}

export interface CreateKeyInput {
  userId: string;
  name: string;
  keyHash: string;
  prefix: string;
  last4: string;
  scope: string;
  quotaLimit: number | null;
  quotaWindow: QuotaWindow;
  ipAllowlist: string[];
}

export interface UpdateKeyInput {
  name?: string;
  enabled?: boolean;
  quotaLimit?: number | null;
  quotaWindow?: QuotaWindow;
  ipAllowlist?: string[];
}

interface KeyRow {
  id: string;
  user_id: string;
  name: string;
  prefix: string;
  key_hash: string;
  last4: string;
  enabled: number;
  scope: string;
  quota_limit: number | null;
  quota_window: QuotaWindow;
  ip_allowlist: string | null;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

function parseAllowlist(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((ip): ip is string => typeof ip === 'string') : [];
  } catch {
    return [];
  }
}

function toKey(row: KeyRow): ApiKey {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    prefix: row.prefix,
    last4: row.last4,
    enabled: row.enabled === 1,
    scope: row.scope,
    quotaLimit: row.quota_limit,
    quotaWindow: row.quota_window,
    ipAllowlist: parseAllowlist(row.ip_allowlist),
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    revokedAt: row.revoked_at,
  };
}

export class ApiKeyRepository {
  constructor(private readonly db: Db) {}

  create(input: CreateKeyInput): ApiKey {
    const id = randomUUID();

    this.db
      .prepare(
        `INSERT INTO api_keys
           (id, user_id, name, prefix, key_hash, last4, enabled, scope, quota_limit, quota_window, ip_allowlist, created_at)
         VALUES
           (@id, @userId, @name, @prefix, @keyHash, @last4, 1, @scope, @quotaLimit, @quotaWindow, @ipAllowlist, @createdAt)`,
      )
      .run({
        id,
        userId: input.userId,
        name: input.name,
        prefix: input.prefix,
        keyHash: input.keyHash,
        last4: input.last4,
        scope: input.scope,
        quotaLimit: input.quotaLimit,
        quotaWindow: input.quotaWindow,
        ipAllowlist: input.ipAllowlist.length ? JSON.stringify(input.ipAllowlist) : null,
        createdAt: new Date().toISOString(),
      });

    return this.findById(input.userId, id)!;
  }

  /** Active (non-revoked) keys belonging to a user, newest first. */
  listByUser(userId: string): ApiKey[] {
    const rows = this.db
      .prepare('SELECT * FROM api_keys WHERE user_id = ? AND revoked_at IS NULL ORDER BY created_at DESC')
      .all(userId) as KeyRow[];
    return rows.map(toKey);
  }

  findById(userId: string, id: string): ApiKey | null {
    const row = this.db
      .prepare('SELECT * FROM api_keys WHERE id = ? AND user_id = ?')
      .get(id, userId) as KeyRow | undefined;
    return row ? toKey(row) : null;
  }

  /** Lookup by the hash of a presented key — used by the auth middleware. */
  findByHash(hash: string): ApiKeyWithHash | null {
    const row = this.db.prepare('SELECT * FROM api_keys WHERE key_hash = ?').get(hash) as
      | KeyRow
      | undefined;
    return row ? { ...toKey(row), keyHash: row.key_hash } : null;
  }

  update(userId: string, id: string, patch: UpdateKeyInput): ApiKey | null {
    const existing = this.findById(userId, id);
    if (!existing) return null;

    const next = {
      name: patch.name ?? existing.name,
      enabled: patch.enabled === undefined ? existing.enabled : patch.enabled,
      quotaLimit: patch.quotaLimit === undefined ? existing.quotaLimit : patch.quotaLimit,
      quotaWindow: patch.quotaWindow ?? existing.quotaWindow,
      ipAllowlist: patch.ipAllowlist ?? existing.ipAllowlist,
    };

    this.db
      .prepare(
        `UPDATE api_keys
            SET name = @name,
                enabled = @enabled,
                quota_limit = @quotaLimit,
                quota_window = @quotaWindow,
                ip_allowlist = @ipAllowlist
          WHERE id = @id AND user_id = @userId`,
      )
      .run({
        id,
        userId,
        name: next.name,
        enabled: next.enabled ? 1 : 0,
        quotaLimit: next.quotaLimit,
        quotaWindow: next.quotaWindow,
        ipAllowlist: next.ipAllowlist.length ? JSON.stringify(next.ipAllowlist) : null,
      });

    return this.findById(userId, id);
  }

  /** Revoke immediately: disabled and stamped so it can never be used again. */
  revoke(userId: string, id: string): ApiKey | null {
    const existing = this.findById(userId, id);
    if (!existing) return null;

    this.db
      .prepare('UPDATE api_keys SET enabled = 0, revoked_at = ? WHERE id = ? AND user_id = ?')
      .run(new Date().toISOString(), id, userId);

    return this.findById(userId, id);
  }

  touchLastUsed(id: string): void {
    this.db.prepare('UPDATE api_keys SET last_used_at = ? WHERE id = ?').run(new Date().toISOString(), id);
  }
}
