import { fixture } from './fixture';

test('rejects future and unbounded usage ranges', async () => {
  const f = await fixture();
  for(const since of [new Date(Date.now()+86400000).toISOString(),new Date(0).toISOString()]) await f.agent.get('/api/me/usage').query({since}).expect(400);
});
