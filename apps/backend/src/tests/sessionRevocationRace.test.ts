import session, { type SessionData } from 'express-session';
import { createDatabase } from '../db/database';
import { SqliteSessionStore } from '../auth/sessionStore';
test('a response finishing after logout cannot resurrect its session', () => {
  const db = createDatabase(':memory:'); const store = new SqliteSessionStore(db);
  const data = { cookie: new session.Cookie(), authenticatedAt: Date.now(), lastActiveAt: Date.now() } as SessionData;
  store.set('old', data); store.destroy('old'); store.set('old', data);
  store.get('old', (_error, value) => expect(value).toBeNull());
  store.set('new', data); store.get('new', (_error, value) => expect(value).not.toBeNull()); db.close();
});
