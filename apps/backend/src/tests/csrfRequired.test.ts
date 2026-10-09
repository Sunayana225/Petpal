import { fixture } from './fixture';
import request from 'supertest';

test('cookie mutations require a CSRF token', async () => {
  const f = await fixture();
  await request(f.app).post('/api/auth/logout').set('Cookie',f.cookie).expect(403);
});
