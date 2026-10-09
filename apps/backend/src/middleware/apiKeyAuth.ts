import type { NextFunction, Request, Response } from 'express';

import { apiKeyRepository, type ApiKey } from '../repositories/apiKeyRepository';
import { usageRepository } from '../repositories/usageRepository';
import { apiKeyService, windowStartIso } from '../services/apiKeyService';
import { env } from '../config/env';
import { userRepository } from '../repositories/userRepository';
import { logger } from '../utils/logger';

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
  const count = req.rawHeaders.filter((_value, index) => index % 2 === 0 && req.rawHeaders[index].toLowerCase() === 'authorization').length;
  if (count > 1 || req.header('x-api-key')) {
    res.status(400).json({ error: 'Bad Request', message: 'Use exactly one Authorization credential.' });
    return;
  }
  const match = /^Bearer\s+(.+)$/i.exec(header);

  if (!match) {
    res.set('WWW-Authenticate', 'Bearer realm="petpal"');
    res.status(401).json({
      error: 'Unauthorized',
      message: 'An API key is required: Authorization: Bearer <key>',
    });
    return;
  }

  const key = apiKeyService().authenticate(match[1].trim());
  if (!key) {
    res.set('WWW-Authenticate', 'Bearer realm="petpal", error="invalid_token"');
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid or revoked API key.' });
    return;
  }
  const owner = userRepository().findById(key.userId);
  if (!owner || owner.disabled) {
    res.set('WWW-Authenticate', 'Bearer realm="petpal", error="invalid_token"');
    res.status(401).json({ error: 'Unauthorized', message: 'Account unavailable.' });
    return;
  }
  const neededScope = ['/check', '/batch-check', '/compare'].includes(req.path.toLowerCase().replace(/\/+$/, '')) ? 'check' : 'dataset';
  if (key.scope !== 'food-safety' && key.scope !== neededScope) {
    res.status(403).json({ error: 'Forbidden', message: 'API key scope does not permit this endpoint.' });
    return;
  }

  const ip = req.ip?.replace(/^::ffff:/, '');
  if (key.ipAllowlist.length > 0 && (!ip || !key.ipAllowlist.map((value) => value.replace(/^::ffff:/, '')).includes(ip))) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'This key is not permitted from your IP address.',
    });
    return;
  }

  const usageId = usageRepository().reserve(key, windowStartIso(key.quotaWindow), windowStartIso('day'), env.accountDailyQuota, env.keyBurstLimit, req.method, req.originalUrl.split('?')[0]);
  if (!usageId) {
    res.setHeader('Retry-After', '60');
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Key, account, or burst quota exceeded.',
      quota: apiKeyService().quotaStatus(key),
    });
    return;
  }

  (req as Request & { apiKey?: ApiKey }).apiKey = key;
  res.locals.usageId = usageId;
  const start = Date.now();
  let completed = false;
  const complete = () => {
    if (completed) return;
    completed = true;
    try {
      usageRepository().complete(usageId, res.writableFinished ? res.statusCode : 499, Date.now() - start);
      apiKeyRepository().touchLastUsed(key.id);
    } catch { logger.error('usage completion failed', { requestId: res.locals.requestId }); }
  };
  res.once('finish', complete);
  res.once('close', complete);
  next();
}

/** Record one usage event (and last-used time) per keyed request. */
export function trackUsage(req: Request, res: Response, next: NextFunction): void {
  if (res.locals.usageId) { next(); return; }
  const key = presentedKey(req);
  if (!key) {
    res.set('WWW-Authenticate', 'Bearer realm="petpal", error="invalid_token"');
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
