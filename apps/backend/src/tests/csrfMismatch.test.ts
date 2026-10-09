import { fixture } from './fixture';
import request from 'supertest';

test('rejects wrong CSRF tokens', async () => {
  const f = await fixture();
  await request(f.app).delete('/api/me/keys/'+f.key.id).set('Cookie',f.cookie).set('x-csrf-token','wrong').expect(403);
});
