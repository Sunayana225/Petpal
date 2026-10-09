import { fixture } from './fixture';
import request from 'supertest';

test('parallel calls cannot overspend key quota', async () => {
  const f = await fixture();
  await f.agent.patch('/api/me/keys/'+f.key.id).send({quotaLimit:2}).expect(200);
const results=await Promise.all(Array.from({length:12},()=>request(f.app).get('/api/v1/food-safety/stats').set('Authorization','Bearer '+f.rawKey)));
expect(results.filter(r=>r.status===200)).toHaveLength(2);expect(results.filter(r=>r.status===429)).toHaveLength(10);
});
