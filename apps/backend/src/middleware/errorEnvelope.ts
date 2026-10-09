import type { Request, Response, NextFunction } from 'express';

/** Preserve existing fields while giving every JSON error a stable envelope. */
export function errorEnvelope(req: Request, res: Response, next: NextFunction): void {
  const json = res.json.bind(res);
  res.json = (body: unknown) => {
    if (res.statusCode >= 400 && body && typeof body === 'object' && !Array.isArray(body)) {
      res.set('Cache-Control', 'no-store');
      const problem = req.accepts(['application/json', 'application/problem+json']) === 'application/problem+json';
      if (problem) res.type('application/problem+json');
      const value = body as Record<string, unknown>;
      const details = Array.isArray(value.details) ? value.details.map((detail: unknown) => {
        if (!detail || typeof detail !== 'object') return detail;
        const { value: _value, ...safe } = detail as Record<string, unknown>;
        void _value;
        return safe;
      }) : value.details;
      return json({ ...(problem ? { type: 'about:blank', title: value.error ?? 'Request failed', status: res.statusCode, detail: value.message, instance: req.path } : {}), ...value, ...(details ? { details } : {}), code: res.statusCode,
        errorCode: value.errorCode ?? `HTTP_${res.statusCode}`,
        requestId: res.locals.requestId, timestamp: new Date().toISOString() });
    }
    return json(body);
  };
  next();
}
