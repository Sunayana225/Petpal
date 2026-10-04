import { createHash, randomBytes } from 'crypto';

import { env } from '../config/env';

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
    options: { quotaLimit?: number | null; quotaWindow?: QuotaWindow } = {},
  ): { key: ApiKey; rawKey: string } {
    const generated = generateApiKey();
    const defaults = defaultQuota();

    const key = this.keys.create({
      userId,
      name,
      keyHash: generated.hash,
      prefix: generated.prefix,
      last4: generated.last4,
      scope: 'food-safety',
      quotaLimit: options.quotaLimit === undefined ? defaults.limit : options.quotaLimit,
      quotaWindow: options.quotaWindow ?? defaults.window,
      ipAllowlist: [],
    });

    return { key, rawKey: generated.raw };
  }

  list(userId: string): ApiKey[] {
    return this.keys.listByUser(userId);
  }

  update(userId: string, id: string, patch: UpdateKeyInput): ApiKey | null {
    return this.keys.update(userId, id, patch);
  }

  revoke(userId: string, id: string): ApiKey | null {
    return this.keys.revoke(userId, id);
  }

  /** Resolve a presented raw key to an enabled, non-revoked key. */
  authenticate(raw: string): ApiKeyWithHash | null {
    if (!raw) return null;
    const key = this.keys.findByHash(hashApiKey(raw));
    if (!key || !key.enabled || key.revokedAt) return null;
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
}

let singleton: ApiKeyService | null = null;

/** Lazily-built shared service — importing this module opens no database. */
export function apiKeyService(): ApiKeyService {
  if (!singleton) singleton = new ApiKeyService();
  return singleton;
}
