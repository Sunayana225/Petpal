import { Request, Response, NextFunction } from 'express';

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
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    message: error.message,
    stack: error.stack,
    statusCode: error.statusCode,
    isOperational: error.isOperational,
    ...(req && {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      body: req.method === 'POST' ? req.body : undefined
    })
  };

  if (process.env.NODE_ENV === 'production') {
    // In production, log as JSON for log aggregation services
    console.error(JSON.stringify(errorInfo));
  } else {
    // In development, log in a more readable format
    console.error('\n=== ERROR ===');
    console.error(`Time: ${timestamp}`);
    console.error(`Message: ${error.message}`);
    console.error(`Status: ${error.statusCode || 500}`);
    if (req) {
      console.error(`Request: ${req.method} ${req.url}`);
      console.error(`IP: ${req.ip}`);
    }
    console.error(`Stack: ${error.stack}`);
    console.error('=============\n');
  }
};

// Global error handler middleware
export const globalErrorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Set default error values
  error.statusCode = error.statusCode || 500;
  error.isOperational = error.isOperational !== undefined ? error.isOperational : false;

  // Log the error
  logError(error, req);

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const errorResponse = {
    error: error.statusCode >= 500 ? 'Internal Server Error' : 'Request Error',
    message: isDevelopment ? error.message : (error.statusCode >= 500 ? 'Something went wrong' : error.message),
    requestId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    ...(isDevelopment && {
      stack: error.stack,
      statusCode: error.statusCode
    })
  };

  res.status(error.statusCode).json(errorResponse);
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new CustomError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

// Async wrapper to catch async errors
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
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
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      external: Math.round(process.memoryUsage().external / 1024 / 1024)
    },
    services: {
      gemini: !!process.env.GEMINI_API_KEY,
      openai: !!process.env.OPENAI_API_KEY
    },
    requestId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  };
  
  res.json(healthInfo);
};
