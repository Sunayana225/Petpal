import { fixture } from './fixture';
import request from 'supertest';

test('denies requests outside the key IP allowlist', async () => {
  const f = await fixture();
  await f.agent.patch('/api/me/keys/'+f.key.id).send({ipAllowlist:['192.0.2.1']}).expect(200);
await request(f.app).get('/api/v1/food-safety/check?pet=dog&food=apple').set('Authorization','Bearer '+f.rawKey).expect(403);
});
