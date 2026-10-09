import { fixture } from './fixture';
import request from 'supertest';

test('rotates keys with a bounded overlap', async () => {
  const f = await fixture();
  const rotated=await f.agent.post('/api/me/keys/'+f.key.id+'/rotate').send({graceSeconds:0}).expect(201);
expect(rotated.body.rawKey).not.toBe(f.rawKey);
await request(f.app).get('/api/v1/food-safety/stats').set('Authorization','Bearer '+f.rawKey).expect(401);
await request(f.app).get('/api/v1/food-safety/stats').set('Authorization','Bearer '+rotated.body.rawKey).expect(200);
});
