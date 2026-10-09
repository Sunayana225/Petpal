import { fixture } from './fixture';
import request from 'supertest';
import { getDb } from '../db/database';
test('expired keys stop authenticating', async () => {
  const f = await fixture();
  await f.agent.patch('/api/me/keys/'+f.key.id).send({expiresAt:new Date(Date.now()+10000).toISOString()}).expect(200);
getDb().prepare('UPDATE api_keys SET expires_at = ? WHERE id = ?').run(new Date(0).toISOString(),f.key.id);
await request(f.app).get('/api/v1/food-safety/check?pet=dog&food=apple').set('Authorization','Bearer '+f.rawKey).expect(401);
});
