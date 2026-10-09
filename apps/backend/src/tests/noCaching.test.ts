import { fixture } from './fixture';

test('account responses are never cacheable', async () => {
  const f = await fixture();
  for(const path of ['/api/auth/me','/api/sessions','/api/me/keys']) {const r=await f.agent.get(path).expect(200);expect(r.headers['cache-control']).toBe('no-store');}
});
