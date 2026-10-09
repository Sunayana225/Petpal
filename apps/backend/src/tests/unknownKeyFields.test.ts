import { fixture } from './fixture';

test('rejects unknown mutation fields', async () => {
  const f = await fixture();
  await f.agent.patch('/api/me/keys/'+f.key.id).send({owner:'someone'}).expect(400);
});
