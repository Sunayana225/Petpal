import type { Request } from 'express';
import { OAuthStateStore } from '../auth/security';
import { getDb } from '../db/database';

test('OAuth records are expiring, one-use, provider- and browser-bound', () => {
  const store = new OAuthStateStore('github');
  const req = { sessionID: 'transaction-browser', session: {}, query: { next: '/tokens' } } as unknown as Request;
  let state = '';
  store.store(req, (error, value: string) => { expect(error).toBeNull(); state = value; });
  store.verify({ ...req, sessionID: 'different' } as Request, state, (error, valid) => { expect(error).toBeNull(); expect(valid).toBe(false); });
  new OAuthStateStore('google').verify(req, state, (_error, valid) => expect(valid).toBe(false));
  store.verify(req, state, (_error, valid) => expect(valid).toBe(true));
  expect(req.session.oauthReturnTo).toBe('/tokens');
  store.verify(req, state, (_error, valid) => expect(valid).toBe(false));
  store.store(req, (_error, value: string) => { state = value; });
  getDb().prepare('UPDATE oauth_transactions SET expires_at = 0 WHERE state = ?').run(state);
  store.verify(req, state, (_error, valid) => expect(valid).toBe(false));
});

test('separate OAuth tabs keep independent destinations', () => {
  const store = new OAuthStateStore('github');
  const req = { sessionID: 'multi-tab', session: {}, query: { next: '/tokens' } } as unknown as Request;
  let first = ''; let second = '';
  store.store(req, (_error, value: string) => { first = value; });
  req.query.next = '/usage';
  store.store(req, (_error, value: string) => { second = value; });
  store.verify(req, first, (_error, valid) => expect(valid).toBe(true));
  expect(req.session.oauthReturnTo).toBe('/tokens');
  store.verify(req, second, (_error, valid) => expect(valid).toBe(true));
  expect(req.session.oauthReturnTo).toBe('/usage');
});
