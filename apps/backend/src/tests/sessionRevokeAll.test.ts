import { fixture } from './fixture';
import request from 'supertest';

test('logout-all removes every account session', async () => {
  const f = await fixture();
  const second=request.agent(f.app);
const identity=(await f.agent.get('/api/auth/me')).body.user;
await second.post('/api/auth/dev-login').send({email:identity.email}).expect(200);
await f.agent.delete('/api/sessions').expect(200);
expect((await second.get('/api/auth/me')).body.user).toBeNull();
});
