import { fixture } from './fixture';
import { getDb } from '../db/database';
test.each(['authenticatedAt', 'lastActiveAt'])('%s timeout ends authentication', async (field) => {
  const f = await fixture();
  const row = getDb().prepare('SELECT sid,data FROM sessions WHERE user_id = ?').get(f.userId) as { sid: string; data: string };
  const data = JSON.parse(row.data) as Record<string, number>;
  data[field] = Date.now() - (field === 'authenticatedAt' ? 25 * 3600000 : 31 * 60000);
  getDb().prepare('UPDATE sessions SET data = ? WHERE sid = ?').run(JSON.stringify(data), row.sid);
  await f.agent.get('/api/auth/me').expect(401);
  expect((await f.agent.get('/api/auth/me')).body.user).toBeNull();
});
