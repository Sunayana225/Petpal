import { fixture } from './fixture';

test('revoking this session signs it out', async () => {
  const f = await fixture();
  const result=await f.agent.get('/api/sessions').expect(200);
await f.agent.delete('/api/sessions/'+result.body.sessions[0].id).expect(200);
expect((await f.agent.get('/api/auth/me')).body.user).toBeNull();
});
