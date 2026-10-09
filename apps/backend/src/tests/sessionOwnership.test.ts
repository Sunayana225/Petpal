import { fixture } from './fixture';
import request from 'supertest';

test('session revocation cannot target another user', async () => {
  const f = await fixture();
  const other=request.agent(f.app); const login=await other.post('/api/auth/dev-login').send({email:'sessions-other@example.com'}).expect(200);other.set('x-csrf-token',login.body.csrfToken);
const result=await f.agent.get('/api/sessions').expect(200);
await other.delete('/api/sessions/'+result.body.sessions[0].id).expect(404);
});
