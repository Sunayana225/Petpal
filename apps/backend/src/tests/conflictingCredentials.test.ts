import { fixture } from './fixture';
import request from 'supertest';

test('rejects conflicting credential headers', async () => {
  const f = await fixture();
  await request(f.app).get('/api/v1/food-safety/stats').set('Authorization','Bearer '+f.rawKey).set('x-api-key',f.rawKey).expect(400);
});
