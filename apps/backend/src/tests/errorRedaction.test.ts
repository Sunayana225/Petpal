import { fixture } from './fixture';

test('validation errors exclude rejected secrets', async () => {
  const f = await fixture();
  const result=await f.agent.patch('/api/me/keys/'+f.key.id).send({ipAllowlist:['secret-key-value']}).expect(400);
expect(JSON.stringify(result.body.details)).not.toContain('secret-key-value');
});
