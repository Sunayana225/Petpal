import { Request, Response, NextFunction } from 'express';

import { logger } from '../utils/logger';
import { API_VERSION } from '../version';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class CustomError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error logging utility
export const logError = (error: AppError, req?: Request) => {
  logger.error(error.message || 'Unhandled error', {
    statusCode: error.statusCode ?? 500,
    isOperational: error.isOperational,
    requestId: (req?.res?.locals?.requestId as string | undefined) ?? undefined,
    ...(req && {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get?.('User-Agent'),
      // Never log request bodies: they can carry keys or personal data.
    }),
    error,
  });
};

/** Human-readable label per status code — keeps responses self-describing. */
const STATUS_LABELS: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  413: 'Payload Too Large',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
};

// Global error handler middleware
// NOTE: Express identifies error middleware purely by arity, so `_next` must
// stay in the signature even though it is never called.
export const globalErrorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  // Set default error values
  error.statusCode = error.statusCode || 500;
  error.isOperational = error.isOperational !== undefined ? error.isOperational : false;

  // Log the error
  logError(error, req);

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const errorResponse = {
    error: STATUS_LABELS[error.statusCode ?? 500] ?? 'Error',
    code: error.statusCode,
    message: isDevelopment
      ? error.message
      : error.statusCode >= 500
        ? 'Something went wrong'
        : error.message,
    requestId:
      (res.locals?.requestId as string | undefined) ??
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`,
    timestamp: new Date().toISOString(),
    ...(isDevelopment && {
      stack: error.stack,
    }),
  };

  res.status(error.statusCode).json(errorResponse);
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new CustomError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

// Async wrapper to catch async errors
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => unknown,
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Rate limit error handler
export const rateLimitHandler = (req: Request, res: Response) => {
  const error = {
    error: 'Too Many Requests',
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes',
    requestId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString()
  };

  logError(new CustomError('Rate limit exceeded', 429), req);
  res.status(429).json(error);
};

// Health check with error monitoring
export const healthCheck = (req: Request, res: Response) => {
  const healthInfo = {
    status: 'OK',
    message: 'PetPal API is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: API_VERSION,
    uptime: Math.floor(process.uptime()),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      external: Math.round(process.memoryUsage().external / 1024 / 1024)
    },
    services: {
      gemini: !!process.env.GEMINI_API_KEY
    },
    requestId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  };
  
  res.json(healthInfo);
};
