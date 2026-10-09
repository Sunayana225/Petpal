import type { Request, Response, NextFunction } from 'express';
import { hasControlCharacters } from '../utils/text';
import { CustomError } from './errorHandler';

/** Reject ambiguous inputs before authentication, parsing, or paid work. */
export function apiContract(req: Request, res: Response, next: NextFunction): void {
  res.vary('Accept');
  if (Buffer.byteLength(req.originalUrl) > 4096) return next(new CustomError('Request URL exceeds 4096 bytes.', 414));
  const params = new URL(req.originalUrl, 'http://localhost').searchParams;
  if ([...params].length > 20) return next(new CustomError('At most 20 query parameters are allowed.', 400));
  const seen = new Set<string>();
  for (const [key, value] of params) {
    if (seen.has(key) || key.includes('[') || key.includes(']') || hasControlCharacters(key) || hasControlCharacters(value)) {
      return next(new CustomError('Query parameters must be unique scalar values without control characters.', 400));
    }
    seen.add(key);
  }
  if (req.header('x-http-method-override') || req.header('x-method-override')) {
    return next(new CustomError('HTTP method override is unsupported.', 400));
  }
  // Explicit error media type is supported by the envelope; successes are JSON.
  if (!req.accepts('json')) return next(new CustomError('This API produces JSON.', 406));
  if (/^\/(?:v1\/)?food-safety(?:\/|$)/i.test(req.path)) {
    if (['GET', 'HEAD'].includes(req.method) && (Number(req.header('content-length')) > 0 || req.header('transfer-encoding'))) {
      return next(new CustomError('GET and HEAD must not contain a request body.', 400));
    }
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.is('application/json')) {
      return next(new CustomError('Food-safety request bodies must use application/json.', 415));
    }
    if (req.header('content-encoding') && req.header('content-encoding')?.toLowerCase() !== 'identity') {
      return next(new CustomError('Compressed food-safety request bodies are unsupported.', 415));
    }
  }
  next();
}
