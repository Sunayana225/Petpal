import { createHash, randomBytes } from 'crypto';

import { env } from '../config/env';
import { CustomError } from '../middleware/errorHandler';

import {
  apiKeyRepository,
  type ApiKey,
  type ApiKeyRepository,
  type ApiKeyWithHash,
  type QuotaWindow,
  type UpdateKeyInput,
} from '../repositories/apiKeyRepository';
import { usageRepository, type UsageRepository } from '../repositories/usageRepository';

export interface GeneratedKey {
  raw: string;
  prefix: string;
  last4: string;
  hash: string;
}

/** Keys are high-entropy, so a plain sha256 is sufficient (no bcrypt cost). */
export function hashApiKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function generateApiKey(): GeneratedKey {
  const raw = `sk-${randomBytes(24).toString('hex')}`;
  return { raw, prefix: raw.slice(0, 8), last4: raw.slice(-4), hash: hashApiKey(raw) };
}

/** ISO timestamp marking the start of the current quota window. */
export function windowStartIso(window: QuotaWindow): string {
  const now = Date.now();
  if (window === 'day') return new Date(now - 24 * 60 * 60 * 1000).toISOString();
  if (window === 'month') return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  return new Date(0).toISOString();
}

export interface QuotaStatus {
  limit: number | null;
  used: number;
  window: QuotaWindow;
  remaining: number | null;
}

function defaultQuota(): { limit: number | null; window: QuotaWindow } {
  const candidate = env.defaultKeyWindow as QuotaWindow | undefined;
  const window: QuotaWindow = candidate && ['day', 'month', 'total'].includes(candidate) ? candidate : 'day';
  return { limit: env.defaultKeyQuota, window };
}

export class ApiKeyService {
  constructor(
    private readonly keys: ApiKeyRepository = apiKeyRepository(),
    private readonly usage: UsageRepository = usageRepository(),
  ) {}

  /** Create a key and return the raw value exactly once. */
  create(
    userId: string,
    name: string,
    options: { quotaLimit?: number | null; quotaWindow?: QuotaWindow; expiresAt?: string | null; scope?: string; ipAllowlist?: string[] } = {},
    rotatingId?: string,
  ): { key: ApiKey; rawKey: string } {
    const generated = generateApiKey();
    const defaults = defaultQuota();

    return this.keys.transaction(() => {
    if (this.keys.listByUser(userId).filter((key) => key.id !== rotatingId && (!key.expiresAt || Date.parse(key.expiresAt) > Date.now())).length >= env.maxActiveKeys) {
      throw new CustomError('Maximum active key count reached.', 409);
    }
    const key = this.keys.create({
      userId,
      name,
      keyHash: generated.hash,
      prefix: generated.prefix,
      last4: generated.last4,
      scope: options.scope ?? 'food-safety',
      quotaLimit: options.quotaLimit === undefined ? defaults.limit : options.quotaLimit,
      quotaWindow: options.quotaWindow ?? defaults.window,
      ipAllowlist: options.ipAllowlist ?? [],
      expiresAt: options.expiresAt ?? null,
    });

    this.keys.audit(userId, 'key.created', key.id);
    return { key, rawKey: generated.raw };
    });
  }

  list(userId: string): ApiKey[] {
    return this.keys.listByUser(userId);
  }

  update(userId: string, id: string, patch: UpdateKeyInput): ApiKey | null {
    return this.keys.transaction(() => {
      const key = this.keys.update(userId, id, patch);
      if (key) this.keys.audit(userId, 'key.updated', id);
      return key;
    });
  }

  revoke(userId: string, id: string): ApiKey | null {
    return this.keys.transaction(() => {
      const key = this.keys.revoke(userId, id);
      if (key) this.keys.audit(userId, 'key.revoked', id);
      return key;
    });
  }

  /** Resolve a presented raw key to an enabled, non-revoked key. */
  authenticate(raw: string): ApiKeyWithHash | null {
    if (!/^sk-[a-f0-9]{48}$/.test(raw)) return null;
    const key = this.keys.findByHash(hashApiKey(raw));
    if (!key || !key.enabled || key.revokedAt || (key.expiresAt && Date.parse(key.expiresAt) <= Date.now())) return null;
    return key;
  }

  quotaStatus(key: ApiKey): QuotaStatus {
    const used = this.usage.countSince(key.id, windowStartIso(key.quotaWindow));
    return {
      limit: key.quotaLimit,
      used,
      window: key.quotaWindow,
      remaining: key.quotaLimit === null ? null : Math.max(0, key.quotaLimit - used),
    };
  }

  isWithinQuota(key: ApiKey): boolean {
    if (key.quotaLimit === null) return true;
    return this.usage.countSince(key.id, windowStartIso(key.quotaWindow)) < key.quotaLimit;
  }

  rotate(userId: string, id: string, graceSeconds: number): { key: ApiKey; rawKey: string; previousExpiresAt: string } | null {
    return this.keys.transaction(() => {
      const old = this.keys.findById(userId, id);
      if (!old || old.revokedAt || (old.expiresAt && Date.parse(old.expiresAt) <= Date.now())) return null;
      const previousExpiresAt = new Date(Math.min(Date.now() + graceSeconds * 1000, old.expiresAt ? Date.parse(old.expiresAt) : Infinity)).toISOString();
      this.keys.update(userId, id, { expiresAt: previousExpiresAt });
      const generated = this.create(userId, old.name, { quotaLimit: old.quotaLimit, quotaWindow: old.quotaWindow, scope: old.scope, ipAllowlist: old.ipAllowlist, expiresAt: old.expiresAt }, id);
      this.keys.audit(userId, 'key.rotated', id);
      return { ...generated, previousExpiresAt };
    });
  }
}

let singleton: ApiKeyService | null = null;

/** Lazily-built shared service — importing this module opens no database. */
export function apiKeyService(): ApiKeyService {
  if (!singleton) singleton = new ApiKeyService();
  return singleton;
}
