import { Router, type NextFunction, type Request, type Response } from 'express';
import { body, validationResult } from 'express-validator';

import { configurePassport, isProviderConfigured, passport, type OAuthProvider } from '../auth/passport';
import { safeReturnPath } from '../auth/returnTo';
import { env } from '../config/env';
import { currentUser } from '../middleware/auth';
import { userRepository, type User } from '../repositories/userRepository';
import { logger } from '../utils/logger';
import { stampLogin, requireRecentAuth } from '../auth/security';
import { requireAuth } from '../middleware/auth';
import rateLimit from 'express-rate-limit';
import { rateLimitHandler } from '../middleware/errorHandler';

const router = Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: env.loginLimit, standardHeaders: true, legacyHeaders: false, handler: rateLimitHandler });
router.use((req, res, next) => {
  if (req.path === '/dev-login' || /^\/(github|google)(\/callback)?$/.test(req.path)) return loginLimiter(req, res, next);
  next();
});
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Register strategies as soon as this router is imported.
configurePassport();

/** Where a signed-in user lands when they did not ask for anywhere specific. */
const DEFAULT_RETURN_PATH = '/dashboard';

/** The session carries the post-sign-in destination across the OAuth round trip. */

function webAppUrl(): string {
  return env.webAppUrl;
}

function isProvider(value: string): value is OAuthProvider {
  return value === 'github' || value === 'google';
}

/**
 * Whether the development sign-in shortcut is available. Off in production
 * and can be disabled locally with `DEV_AUTH=0`.
 */
function devAuthEnabled(): boolean {
  return env.devAuthEnabled;
}

/**
 * Which sign-in methods this server can actually offer.
 *
 * The client calls this before rendering buttons, so it never shows a provider
 * that would answer 503, and can tell the operator exactly which callback URL to
 * register. Defined before `/:provider` so it is not swallowed by that route.
 */
router.get('/providers', (_req: Request, res: Response) => {
  res.json({
    providers: {
      github: isProviderConfigured('github'),
      google: isProviderConfigured('google'),
    },
    dev: devAuthEnabled(),
    callbackBase: env.oauthCallbackBase,
  });
});

/** Who am I? Hydrates the SPA; returns `null` when signed out. */
router.get('/me', (req: Request, res: Response) => {
  res.json({ user: currentUser(req) ?? null, csrfToken: req.session.csrfToken ?? null });
});

/** End the session. */
router.post('/logout', (req: Request, res: Response, next: NextFunction) => {
  req.logout((error) => {
    if (error) return next(error);
    req.session.destroy((destroyError) => {
      if (destroyError) return next(destroyError);
      res.clearCookie('petpal.sid', {
        path: '/',
        httpOnly: true,
        sameSite: env.sessionCookieSameSite,
        secure: env.sessionCookieSecure,
        ...(env.sessionCookieDomain ? { domain: env.sessionCookieDomain } : {}),
      });
      res.json({ ok: true });
    });
  });
});

/**
 * POST /api/auth/dev-login
 * Development-only sign-in that skips OAuth so the console can be used locally.
 * Always refused in production.
 */
router.post('/dev-login', [
  body('email').optional().isString().bail().trim().isEmail().isLength({ max: 254 }),
  body('name').optional().isString().bail().trim().isLength({ min: 1, max: 100 }),
], (req: Request, res: Response, next: NextFunction) => {
  if (!devAuthEnabled()) {
    res.status(404).json({ error: 'Not Found', message: 'Dev sign-in is disabled.' });
    return;
  }

  if (!validationResult(req).isEmpty()) {
    res.status(400).json({ error: 'Validation Error', message: 'Invalid sign-in input.' });
    return;
  }

  const email = String(req.body?.email ?? 'dev@petpal.local').trim().toLowerCase();
  const name = String(req.body?.name ?? 'Dev User').trim() || 'Dev User';

  const user = userRepository().upsertFromOAuth({
    provider: 'dev',
    providerUserId: email,
    email,
    name,
  });
  if (user.disabled) {
    res.status(403).json({ error: 'Forbidden', message: 'Account is disabled.' });
    return;
  }

  // Rotate the session id on sign-in. A cookie issued before authenticating must
  // never become an authenticated one — that is session fixation.
  req.session.regenerate((regenerateError) => {
    if (regenerateError) {
      next(regenerateError);
      return;
    }
    req.login(user, (error) => {
      if (error) {
        next(error);
        return;
      }
      stampLogin(req);
      req.session.save((saveError) => {
        if (saveError) return next(saveError);
        res.json({ user, csrfToken: req.session.csrfToken });
      });
    });
  });
});

/** Kick off the OAuth dance for a provider. */
router.get('/:provider', (req: Request, res: Response, next: NextFunction) => {
  const provider = String(req.params.provider);

  if (!isProvider(provider)) {
    res.status(404).json({ error: 'Not Found', message: 'Unknown provider.' });
    return;
  }
  if (!isProviderConfigured(provider)) {
    res.status(503).json({
      error: 'Unavailable',
      message: `${provider} sign-in is not configured on this server.`,
    });
    return;
  }

  // Remember where to come back to. Kept on the session rather than in the
  // `state` parameter, so it needs no verification of its own — and it is
  // validated again on the way out, because a session can be reused.
  if (req.query.link === '1') {
    if (!currentUser(req) || !req.session.authenticatedAt || Date.now() - req.session.authenticatedAt > env.reauthMs) {
      res.status(403).json({ error: 'Forbidden', errorCode: 'REAUTH_REQUIRED', message: 'Sign in again before linking an account.' });
      return;
    }
  }

  passport.authenticate(provider, {
    scope: provider === 'github' ? ['user:email'] : ['profile', 'email'],
  })(req, res, next);
});

/** Provider redirect target: establish the session, then hand back to the SPA. */
router.get('/:provider/callback', (req: Request, res: Response, next: NextFunction) => {
  const provider = String(req.params.provider);

  if (!isProvider(provider)) {
    res.status(404).json({ error: 'Not Found', message: 'Unknown provider.' });
    return;
  }
  if (!isProviderConfigured(provider)) {
    res.status(503).json({ error: 'Unavailable', message: 'Sign-in provider is not configured.' });
    return;
  }

  // A custom callback keeps control of the session: passport does not log the
  // user in by itself here, so we can rotate the session id *first* and then log
  // in on the fresh id.
  passport.authenticate(provider, {}, (error: unknown, user?: User, info?: { message?: string }) => {
    if (error || !user) {
      logger.warn('oauth sign-in failed', { provider });
      const reason = req.query.error === 'access_denied' ? 'cancelled' : error ? 'provider' : info?.message ? 'state' : 'oauth';
      res.redirect(`${webAppUrl()}/login?error=${reason}`);
      return;
    }

    // Read the destination before regenerating — the old session is discarded.
    const returnTo = safeReturnPath(req.session.oauthReturnTo);

    req.session.regenerate((regenerateError) => {
      if (regenerateError) {
        next(regenerateError);
        return;
      }
      req.logIn(user, (loginError) => {
        if (loginError) {
          next(loginError);
          return;
        }
        stampLogin(req);
        req.session.save((saveError) => {
          if (saveError) return next(saveError);
          res.redirect(`${webAppUrl()}${returnTo ?? DEFAULT_RETURN_PATH}`);
        });
      });
    });
  })(req, res, next);
});

router.get('/account/identities', requireAuth, (req, res) => {
  res.json({ identities: userRepository().identities(currentUser(req)!.id) });
});
router.delete('/account/identities/:provider', requireAuth, requireRecentAuth, (req, res) => {
  const removed = userRepository().unlink(currentUser(req)!.id, String(req.params.provider));
  if (!removed) return res.status(409).json({ error: 'Conflict', message: 'Keep at least one sign-in method; provider must be linked.' });
  res.json({ ok: true });
});

export { router as authRouter };
