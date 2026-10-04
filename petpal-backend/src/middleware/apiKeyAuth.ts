import type { NextFunction, Request, Response } from 'express';

import { apiKeyRepository, type ApiKey } from '../repositories/apiKeyRepository';
import { usageRepository } from '../repositories/usageRepository';
import { apiKeyService } from '../services/apiKeyService';

/** The key authenticated on this request, if any. */
export function presentedKey(req: Request): ApiKey | undefined {
  return (req as Request & { apiKey?: ApiKey }).apiKey;
}

/**
 * Gate for the developer surface (`/api/v1/*`). Expects
 * `Authorization: Bearer sk-…`, enforces the key's IP allowlist and quota, and
 * attaches the key for {@link trackUsage}.
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  // Already authenticated by an outer mount (e.g. /api/v1) — don't re-check.
  if (presentedKey(req)) {
    next();
    return;
  }

  const header = (req.header('authorization') ?? '').trim();
  const match = /^Bearer\s+(.+)$/i.exec(header);

  if (!match) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'An API key is required: Authorization: Bearer <key>',
    });
    return;
  }

  const key = apiKeyService().authenticate(match[1].trim());
  if (!key) {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid or revoked API key.' });
    return;
  }

  if (key.ipAllowlist.length > 0 && req.ip && !key.ipAllowlist.includes(req.ip)) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'This key is not permitted from your IP address.',
    });
    return;
  }

  if (!apiKeyService().isWithinQuota(key)) {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'API key quota exceeded.',
      quota: apiKeyService().quotaStatus(key),
    });
    return;
  }

  (req as Request & { apiKey?: ApiKey }).apiKey = key;
  next();
}

/** Record one usage event (and last-used time) per keyed request. */
export function trackUsage(req: Request, res: Response, next: NextFunction): void {
  const key = presentedKey(req);
  if (!key) {
    next();
    return;
  }

  const start = Date.now();
  res.on('finish', () => {
    usageRepository().record({
      keyId: key.id,
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      latencyMs: Date.now() - start,
    });
    apiKeyRepository().touchLastUsed(key.id);
  });

  next();
}
