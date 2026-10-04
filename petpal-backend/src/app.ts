import cors from 'cors';
import express, { Express, NextFunction, Request, Response, Router } from 'express';
import session from 'express-session';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { configurePassport, passport } from './auth/passport';
import { SqliteSessionStore } from './auth/sessionStore';
import { getDb } from './db/database';
import { checkOrigin } from './middleware/auth';
import { requireApiKey, trackUsage } from './middleware/apiKeyAuth';
import {
  globalErrorHandler,
  healthCheck,
  notFoundHandler,
  rateLimitHandler,
} from './middleware/errorHandler';
import { checkFoodSafetyHandler, foodSafetyRouter } from './routes/foodSafety';
import { adminRouter } from './routes/admin';
import { authRouter } from './routes/auth';
import { geminiRouter } from './routes/gemini';
import { meRouter } from './routes/keys';
import { monitoringRouter, trackMetrics } from './routes/monitoring';
import { SUPPORTED_PET_KEYS } from './utils/normalization';
import { API_VERSION } from './version';

/** Re-exported for existing importers; the value lives in `./version`. */
export { API_VERSION };

const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:19006',
  'http://localhost:8081',
  'exp://localhost:19000',
  'http://127.0.0.1:3000',
];

/**
 * Stamp every request with a correlation id so an error logged on one line can
 * be matched to the response the client actually received.
 */
function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  const id = incoming && /^[\w-]{1,64}$/.test(incoming) ? incoming : generateId();
  res.locals.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Sessions must be signed with a real secret in production. */
function sessionSecret(env: string): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (env === 'production') throw new Error('SESSION_SECRET must be set in production');
  return 'petpal-dev-secret-change-me';
}

/**
 * Build the Express application.
 *
 * Split out of `server.ts` deliberately: importing a module that calls
 * `app.listen()` at load time makes the app untestable, which is why the old
 * test suite rebuilt a stripped-down duplicate of the middleware stack and
 * never actually exercised helmet, CORS, rate limiting, the 404 handler or the
 * global error handler. Tests now build the *real* app.
 */
export function createApp(): Express {
  const app = express();
  const NODE_ENV = process.env.NODE_ENV || 'development';

  // Behind Render (and any other reverse proxy) `req.ip` is the proxy unless we
  // say otherwise, which would rate-limit every user as one. `1` trusts a single
  // hop — deliberately not `true`, which would let clients spoof X-Forwarded-For.
  if (NODE_ENV === 'production' || process.env.TRUST_PROXY === '1') {
    app.set('trust proxy', 1);
  }

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https://generativelanguage.googleapis.com'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  const limiter = rateLimit({
    windowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    handler: rateLimitHandler,
    standardHeaders: true,
    legacyHeaders: false,
    // An uptime monitor must not be able to exhaust a real user's quota.
    skip: (req: Request) => req.path === '/api/health',
  });
  app.use('/api/', limiter);

  if (NODE_ENV !== 'test') {
    app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  const corsOptions = {
    origin:
      NODE_ENV === 'production'
        ? process.env.CORS_ORIGIN?.split(',') || []
        : DEV_ORIGINS,
    credentials: true,
    optionsSuccessStatus: 200,
  };
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));
  app.use(requestId);
  app.use(trackMetrics);

  // Sessions + Passport power the developer console. The store is SQLite, so
  // logins survive a restart.
  app.use(
    session({
      name: 'petpal.sid',
      store: new SqliteSessionStore(getDb()),
      secret: sessionSecret(NODE_ENV),
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      },
    }),
  );
  configurePassport();
  app.use(passport.initialize());
  app.use(passport.session());
  app.use('/api/', checkOrigin);

  if (NODE_ENV === 'production') {
    app.use((_req: Request, res: Response, next: NextFunction) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      next();
    });
  }

  // ---- Routes -------------------------------------------------------------
  app.use('/api/auth', authRouter);
  app.use('/api/gemini', geminiRouter);
  app.use('/api/me', meRouter);
  app.use('/api/food-safety', foodSafetyRouter);
  app.use('/api/monitoring', monitoringRouter);
  app.use('/api/admin', adminRouter);

  // Keyed developer surface: the same handlers, behind an API key, with usage
  // metering and a per-key quota. The public `/api/food-safety` mount above
  // stays open for the shipped apps.
  const developer = Router();
  developer.use(requireApiKey, trackUsage);
  developer.use('/food-safety', foodSafetyRouter);
  app.use('/api/v1', developer);

  app.get('/api/health', healthCheck);

  // Documented by the README, and the first thing anyone types into a browser.
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'PetPal Food Safety API',
      version: API_VERSION,
      status: 'running',
      description:
        'Instant, veterinary-sourced answers to "can my pet eat this?" across 10 species.',
      documentation: 'https://github.com/Sunayana225/Petpal#-complete-api-documentation',
      endpoints: {
        health: '/api/health',
        info: '/api/info',
        check: 'POST /api/food-safety/check',
        search: 'GET /api/food-safety/search?q=<food>&pet=<pet>',
        pets: '/api/food-safety/pets',
        stats: '/api/food-safety/stats',
      },
    });
  });

  app.get('/api/info', (_req: Request, res: Response) => {
    res.json({
      name: 'PetPal Food Safety API',
      version: API_VERSION,
      description: 'API for checking pet food safety across multiple pet types',
      supportedPets: [...SUPPORTED_PET_KEYS],
      endpoints: {
        root: '/',
        health: '/api/health',
        info: '/api/info',
        foodSafety: 'POST /api/food-safety/check',
        foodSafetyGet: 'GET /api/food-safety/check?pet=<pet>&food=<food>',
        search: 'GET /api/food-safety/search?q=<food>',
        safeFoods: 'GET /api/food-safety/safe/:pet',
        cautionFoods: 'GET /api/food-safety/caution/:pet',
        unsafeFoods: 'GET /api/food-safety/unsafe/:pet',
        supportedPets: '/api/food-safety/pets',
        stats: '/api/food-safety/stats',
        metrics: '/api/monitoring/metrics',
        status: '/api/monitoring/status',
      },
    });
  });

  // Legacy alias for the original `GET /api/check?animal=<pet>&food=<food>`
  // contract used by test-api.html and early integrations. Maps `animal` onto
  // `pet` and reuses the exact same handler, so behaviour can't diverge.
  app.get(
    '/api/check',
    (req: Request, _res: Response, next: NextFunction) => {
      if (!req.query.pet && req.query.animal) {
        req.query.pet = String(req.query.animal);
      }
      next();
    },
    checkFoodSafetyHandler,
  );

  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
}
