import { Router, type NextFunction, type Request, type Response } from 'express';
import type { SessionData } from 'express-session';

import { configurePassport, isProviderConfigured, passport, type OAuthProvider } from '../auth/passport';
import { safeReturnPath } from '../auth/returnTo';
import { env } from '../config/env';
import { currentUser } from '../middleware/auth';
import { userRepository } from '../repositories/userRepository';

const router = Router();

// Register strategies as soon as this router is imported.
configurePassport();

/** Where a signed-in user lands when they did not ask for anywhere specific. */
const DEFAULT_RETURN_PATH = '/dashboard';

/** The session carries the post-sign-in destination across the OAuth round trip. */
type SessionWithReturn = SessionData & { returnTo?: string };

function webAppUrl(): string {
  return env.webAppUrl;
}

function isProvider(value: string): value is OAuthProvider {
  return value === 'github' || value === 'google';
}

/**
 * Whether the development sign-in shortcut is available. Off in production
 * unless explicitly enabled with `DEV_AUTH=1`.
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
  res.json({ user: currentUser(req) ?? null });
});

/** End the session. */
router.post('/logout', (req: Request, res: Response) => {
  req.logout(() => {
    req.session?.destroy(() => {
      res.json({ ok: true });
    });
  });
});

/**
 * POST /api/auth/dev-login
 * Development-only sign-in that skips OAuth so the console can be used locally.
 * Refused in production unless `DEV_AUTH=1`.
 */
router.post('/dev-login', (req: Request, res: Response, next: NextFunction) => {
  if (!devAuthEnabled()) {
    res.status(404).json({ error: 'Not Found', message: 'Dev sign-in is disabled.' });
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

  req.login(user, (error) => {
    if (error) {
      next(error);
      return;
    }
    res.json({ user });
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
  (req.session as SessionWithReturn).returnTo = safeReturnPath(req.query.next) ?? undefined;

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

  passport.authenticate(provider, {
    failureRedirect: `${webAppUrl()}/login?error=oauth`,
  })(req, res, () => {
    const session = req.session as SessionWithReturn;
    const target = safeReturnPath(session.returnTo) ?? DEFAULT_RETURN_PATH;
    delete session.returnTo;
    res.redirect(`${webAppUrl()}${target}`);
  });
  void next;
});

export { router as authRouter };
