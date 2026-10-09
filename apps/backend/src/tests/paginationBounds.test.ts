import { fixture } from './fixture';

test('bounds list and history pagination', async () => {
  const f = await fixture();
  for(const query of ['limit=0','limit=101','offset=-1']) await f.agent.get('/api/me/keys?'+query).expect(400);
});
