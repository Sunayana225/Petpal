import { Router, type NextFunction, type Request, type Response } from 'express';

import { configurePassport, isProviderConfigured, passport, type OAuthProvider } from '../auth/passport';
import { currentUser } from '../middleware/auth';
import { userRepository } from '../repositories/userRepository';

const router = Router();

// Register strategies as soon as this router is imported.
configurePassport();

function webAppUrl(): string {
  return process.env.WEB_APP_URL ?? 'http://localhost:3000';
}

function isProvider(value: string): value is OAuthProvider {
  return value === 'github' || value === 'google';
}

/**
 * Whether the development sign-in shortcut is available. Off in production
 * unless explicitly enabled with `DEV_AUTH=1`.
 */
function devAuthEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.DEV_AUTH === '1';
}

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
    res.redirect(`${webAppUrl()}/dashboard`);
  });
  void next;
});

export { router as authRouter };
