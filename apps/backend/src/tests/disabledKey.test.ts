import { fixture } from './fixture';
import request from 'supertest';

test('disabled keys cannot authenticate', async () => {
  const f = await fixture();
  await f.agent.patch('/api/me/keys/'+f.key.id).send({enabled:false}).expect(200);
await request(f.app).get('/api/v1/food-safety/stats').set('Authorization','Bearer '+f.rawKey).expect(401);
});
