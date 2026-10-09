import { fixture } from './fixture';
import request from 'supertest';

test('rejects oversized bearer credentials', async () => {
  const f = await fixture();
  await request(f.app).get('/api/v1/food-safety/stats').set('Authorization','Bearer '+'x'.repeat(1000)).expect(401);
});
