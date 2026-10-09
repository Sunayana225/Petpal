import { fixture } from './fixture';

test('key pages have disjoint stable ordering', async () => {
  const f = await fixture();
  await f.agent.post('/api/me/keys').send({name:'second'}).expect(201);
const first=await f.agent.get('/api/me/keys?limit=1').expect(200);
const second=await f.agent.get('/api/me/keys?limit=1&offset=1').expect(200);
expect(first.body.pagination.hasMore).toBe(true); expect(first.body.keys[0].id).not.toBe(second.body.keys[0].id);
});
