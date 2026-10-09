import type { Request, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import { isIP } from 'net';

export function validate(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation Error', message: 'Invalid input provided',
      details: errors.array().map((error) => ({ type: error.type, message: error.msg, ...('path' in error ? { field: error.path } : {}) })) });
    return;
  }
  next();
}

const fields = ['name', 'enabled', 'quotaLimit', 'quotaWindow', 'scope', 'ipAllowlist', 'expiresAt'];
export function keyShape(req: Request, res: Response, next: NextFunction): void {
  const value: unknown = req.body;
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Object.keys(value).length ||
      Object.keys(value).some((key) => !fields.includes(key))) {
    res.status(400).json({ error: 'Validation Error', message: 'Provide supported key fields.' });
    return;
  }
  next();
}

export const keyOptions = () => [
  body('quotaLimit').optional({ nullable: true }).custom((value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 1000000000),
  body('quotaWindow').optional().isIn(['day', 'month', 'total']),
  body('scope').optional().isIn(['food-safety', 'check', 'dataset']),
  body('ipAllowlist').optional().custom((value: unknown) => Array.isArray(value) && value.length <= 20 && value.every((ip) => typeof ip === 'string' && isIP(ip) !== 0)),
  body('expiresAt').optional({ nullable: true }).isISO8601({ strict: true }).bail().custom((value: string) => Date.parse(value) > Date.now() && Date.parse(value) <= Date.now() + 366 * 86400000).toDate().customSanitizer((value: Date) => value.toISOString()),
];

export const paging = () => [query('limit').optional().isInt({ min: 1, max: 100 }), query('offset').optional().isInt({ min: 0, max: 100000 })];
export function pageOf(req: Request): { limit: number; offset: number } {
  return { limit: Number(req.query.limit ?? 50), offset: Number(req.query.offset ?? 0) };
}
export const usageRange = () => query('since').optional().isISO8601({ strict: true }).bail().custom((value: string) => {
  const date = Date.parse(value);
  return date <= Date.now() && date >= Date.now() - 366 * 86400000;
}).customSanitizer((value: string) => new Date(value).toISOString());
