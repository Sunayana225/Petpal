import session, { type SessionData } from 'express-session';
import { createDatabase } from '../db/database';
import { SqliteSessionStore } from '../auth/sessionStore';

test('the session store routes database failures through every callback', () => {
  const db = createDatabase(':memory:'); const store = new SqliteSessionStore(db); db.close();
  const data = { cookie: new session.Cookie(), authenticatedAt: Date.now(), lastActiveAt: Date.now() } as SessionData;
  const callbacks = Array.from({ length: 6 }, () => jest.fn());
  store.get('s', callbacks[0]); store.set('s', data, callbacks[1]); store.destroy('s', callbacks[2]);
  store.touch('s', data, callbacks[3]); store.length(callbacks[4]); store.clear(callbacks[5]);
  for (const callback of callbacks) { expect(callback).toHaveBeenCalledTimes(1); expect(callback.mock.calls[0][0]?.name).toMatch(/Error$/); }
});

test('expired session cleanup is bounded and persisted activity survives reload', () => {
  const db = createDatabase(':memory:'); const store = new SqliteSessionStore(db);
  const insert = db.prepare('INSERT INTO sessions VALUES (?, NULL, ?, 0)');
  for (let index = 0; index < 600; index++) insert.run(String(index), '{}');
  store.get('missing', (error) => expect(error).toBeNull());
  expect((db.prepare('SELECT COUNT(*) AS n FROM sessions').get() as { n: number }).n).toBe(100);
  const data = { cookie: new session.Cookie(), authenticatedAt: Date.now(), lastActiveAt: Date.now() } as SessionData;
  store.set('active', data); data.lastActiveAt! += 1000; store.touch('active', data);
  store.get('active', (_error, read) => expect(read?.lastActiveAt).toBe(data.lastActiveAt)); db.close();
});
