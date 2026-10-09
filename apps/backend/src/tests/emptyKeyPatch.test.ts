import { fixture } from './fixture';

test('rejects empty key updates', async () => {
  const f = await fixture();
  await f.agent.patch('/api/me/keys/'+f.key.id).send({}).expect(400);
});
