import { fixture } from './fixture';
import request from 'supertest';

test('enforces check-only scope', async () => {
  const f = await fixture();
  await f.agent.patch('/api/me/keys/'+f.key.id).send({scope:'check'}).expect(200);
await request(f.app).get('/api/v1/food-safety/stats').set('Authorization','Bearer '+f.rawKey).expect(403);
await request(f.app).get('/api/v1/food-safety/check?pet=dog&food=apple').set('Authorization','Bearer '+f.rawKey).expect(200);
});
