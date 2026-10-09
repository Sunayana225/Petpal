import { fixture } from './fixture';
import request from 'supertest';

test('all key operations enforce ownership', async () => {
  const f = await fixture();
  const other=request.agent(f.app);
const login=await other.post('/api/auth/dev-login').send({email:'other@example.com'}).expect(200); other.set('x-csrf-token',login.body.csrfToken);
await other.get('/api/me/keys/'+f.key.id+'/usage').expect(404);
await other.patch('/api/me/keys/'+f.key.id).send({name:'hijack'}).expect(404);
await other.delete('/api/me/keys/'+f.key.id).expect(404);
await other.post('/api/me/keys/'+f.key.id+'/rotate').send({}).expect(404);
});
