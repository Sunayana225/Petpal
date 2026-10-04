import type { NextFunction, Request, Response } from 'express';

import { env } from '../config/env';
import type { User } from '../repositories/userRepository';

/** The user attached to the request by Passport, if any. */
export function currentUser(req: Request): User | undefined {
  return (req as Request & { user?: User }).user;
}

export function isAuthenticated(req: Request): boolean {
  return Boolean(currentUser(req));
}

/** Reject anonymous requests. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (isAuthenticated(req)) {
    next();
    return;
  }
  res.status(401).json({ error: 'Unauthorized', message: 'Sign in required.' });
}

/**
 * Admin-only. Accepts an authenticated admin session, or the `ADMIN_TOKEN`
 * shared secret for ops/CI. Fails closed when neither is present.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (currentUser(req)?.role === 'admin') {
    next();
    return;
  }

  const expected = env.adminToken;
  if (expected && req.header('x-admin-token') === expected) {
    next();
    return;
  }

  res.status(401).json({
    error: 'Unauthorized',
    message: 'A valid admin token or admin session is required.',
  });
}

function allowedOrigins(): string[] {
  return env.corsOrigins;
}

/** A request from our own origin is always trusted. */
function isSameOrigin(origin: string, host: string | undefined): boolean {
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * CSRF defence for state-changing requests: a browser that sends an `Origin`
 * must be one we trust. Requests without an Origin (curl, server-to-server,
 * supertest) are allowed, since they are not subject to CSRF.
 */
export function checkOrigin(req: Request, res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  const origin = req.header('origin');
  if (!origin || allowedOrigins().includes(origin) || isSameOrigin(origin, req.header('host'))) {
    next();
    return;
  }

  res.status(403).json({ error: 'Forbidden', message: 'Cross-origin request blocked.' });
}
