import { fixture } from './fixture';

test('rejects malformed IP allowlists', async () => {
  const f = await fixture();
  await f.agent.patch('/api/me/keys/'+f.key.id).send({ipAllowlist:['not-an-ip']}).expect(400);
});
