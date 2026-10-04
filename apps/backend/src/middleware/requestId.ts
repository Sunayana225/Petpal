import type { NextFunction, Request, Response } from 'express';

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Stamp every request with a correlation id so an error logged on one line can
 * be matched to the response the client actually received. An upstream-supplied
 * id is honoured when it looks sane.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  const id = incoming && /^[\w-]{1,64}$/.test(incoming) ? incoming : generateId();
  res.locals.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}
