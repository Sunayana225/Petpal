import { fixture } from './fixture';

test('rejects string and fractional quotas', async () => {
  const f = await fixture();
  for (const quotaLimit of ['10',1.5,-1]) await f.agent.patch('/api/me/keys/'+f.key.id).send({quotaLimit}).expect(400);
});
