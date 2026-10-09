import { createHash } from 'crypto';
import type { Request, Response } from 'express';

/** Authentication and quota admission happen before any conditional response. */
export function conditionalJson(req: Request, res: Response, body: unknown, revision?: string): void {
  const etag = `"${createHash('sha256').update(JSON.stringify(body)).digest('hex')}"`;
  res.set('ETag', etag);
  res.set('Cache-Control', 'private, max-age=0, must-revalidate');
  res.vary('Authorization');
  if (revision) res.set('X-Dataset-Revision', revision);
  const parse = (value: string) => value.split(',').map(tag => tag.trim());
  const match = req.header('if-match');
  if (match && !parse(match).some(tag => tag === '*' || tag === etag)) {
    res.status(412).json({ error: 'Precondition Failed', message: 'Representation changed.' });
    return;
  }
  const none = req.header('if-none-match');
  if (none && parse(none).some(tag => tag === '*' || tag.replace(/^W\//, '') === etag)) {
    res.status(304).end();
    return;
  }
  res.json(body);
}
