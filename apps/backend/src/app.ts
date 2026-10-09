import cors from 'cors';
import express, { Express, NextFunction, Request, Response } from 'express';
import session from 'express-session';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { configurePassport, passport } from './auth/passport';
import { SqliteSessionStore } from './auth/sessionStore';
import { enforceSession, csrfProtection } from './auth/security';
import { env } from './config/env';
import { API_VERSION } from './config/version';
import { getDb } from './db/database';
import { checkOrigin } from './middleware/auth';
import {
  globalErrorHandler,
  notFoundHandler,
  rateLimitHandler,
} from './middleware/errorHandler';
import { requestId } from './middleware/requestId';
import { apiContract } from './middleware/apiContract';
import { errorEnvelope } from './middleware/errorEnvelope';
import { createApiRouter, rootHandler } from './routes';
import { trackMetrics } from './routes/monitoring';
import { FoodSafetyService } from './services/foodSafetyService';
import { logger } from './utils/logger';

/** Re-exported for existing importers; the value lives in `./config/version`. */
export { API_VERSION };

/**
 * Build the Express application.
 *
 * This function is the composition root: it wires middleware and hands the
 * route layer the services it needs. Route modules never construct their own
 * dependencies, which is what makes them independently testable.
 *
 * Split out of the entry point deliberately — a module that calls `app.listen()`
 * at import time cannot be tested, which is why the original suite rebuilt a
 * stripped-down duplicate of this stack and never exercised helmet, CORS, rate
 * limiting, the 404 handler or the global error handler.
 */
export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(requestId);
  app.use((_req, res, next) => { res.set('X-API-Version', API_VERSION); next(); });
  app.use(errorEnvelope);
  app.use(trackMetrics);

  // Behind a reverse proxy `req.ip` is the proxy unless we say otherwise, which
  // would rate-limit every user as one. `1` trusts a single hop — deliberately
  // not `true`, which would let clients spoof X-Forwarded-For.
  if (env.isProduction || env.trustProxy) {
    app.set('trust proxy', 1);
  }

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'", 'https://generativelanguage.googleapis.com'],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
      optionsSuccessStatus: 200,
      exposedHeaders: ['X-Request-Id', 'X-API-Version', 'ETag', 'X-Dataset-Revision', 'Link', 'Retry-After', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
      maxAge: 600,
    }),
  );

  const limiter = rateLimit({
    windowMs: env.rateLimitWindowMs,
    max: env.rateLimitMax,
    handler: rateLimitHandler,
    standardHeaders: true,
    legacyHeaders: false,
    // An uptime monitor must not be able to exhaust a real user's quota.
    skip: (req: Request) => req.path === '/api/health',
  });
  app.use('/api/', limiter);

  if (!env.isTest) {
    // Query strings can contain OAuth codes and state. Log paths only.
    morgan.token('safe-path', (req) => req.url?.split('?')[0] ?? '/');
    app.use(morgan(':method :safe-path :status :response-time ms'));
  }

  app.use('/api', apiContract);
  app.use(express.json({ limit: '100kb', inflate: false }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  // Sessions + Passport power the developer console. The store is SQLite, so
  // logins survive a restart.
  const cookieSameSite = env.sessionCookieSameSite;

  if (cookieSameSite === 'none' && env.corsOrigins.length === 0) {
    logger.warn(
      'SESSION_COOKIE_SAMESITE=none without CORS_ORIGIN: the browser will drop the ' +
        'session cookie and sign-in will look like it worked but leave you signed out',
    );
  }

  app.use(
    session({
      name: 'petpal.sid',
      store: new SqliteSessionStore(getDb()),
      secret: env.sessionSecrets,
      resave: false,
      saveUninitialized: false,
      // Trust `X-Forwarded-Proto`, so a `Secure` cookie is still set when TLS is
      // terminated by the host's proxy rather than by this process.
      proxy: env.isProduction || env.trustProxy,
      cookie: {
        httpOnly: true,
        sameSite: cookieSameSite,
        secure: env.sessionCookieSecure,
        ...(env.sessionCookieDomain ? { domain: env.sessionCookieDomain } : {}),
        maxAge: 30 * 24 * 60 * 60 * 1000,
      },
    }),
  );
  configurePassport();
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(enforceSession);
  app.use('/api/', checkOrigin);
  app.use('/api/', csrfProtection);

  if (env.isProduction) {
    app.use((_req: Request, res: Response, next: NextFunction) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      next();
    });
  }

  // ---- Routes -------------------------------------------------------------
  app.use('/api', createApiRouter({ foodSafety: new FoodSafetyService() }));
  app.get('/', rootHandler);

  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
}
