import { fixture } from './fixture';
import request from 'supertest';

test('revoked keys cannot be reenabled', async () => {
  const f = await fixture();
  await f.agent.delete('/api/me/keys/'+f.key.id).expect(200);
await f.agent.patch('/api/me/keys/'+f.key.id).send({enabled:true}).expect(404);
await request(f.app).get('/api/v1/food-safety/stats').set('Authorization','Bearer '+f.rawKey).expect(401);
});
