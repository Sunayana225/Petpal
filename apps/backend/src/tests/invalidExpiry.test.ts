import { fixture } from './fixture';

test('rejects past and malformed expiry dates', async () => {
  const f = await fixture();
  for(const expiresAt of ['garbage',new Date(0).toISOString()]) await f.agent.patch('/api/me/keys/'+f.key.id).send({expiresAt}).expect(400);
});
