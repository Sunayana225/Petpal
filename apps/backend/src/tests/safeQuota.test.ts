import { fixture } from './fixture';

test('rejects unsafe integer quotas', async () => {
  const f = await fixture();
  await f.agent.patch('/api/me/keys/'+f.key.id).send({quotaLimit:Number.MAX_SAFE_INTEGER+1}).expect(400);
});
