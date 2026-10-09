import { fixture } from './fixture';

test('session listings do not disclose bearer cookies', async () => {
  const f = await fixture();
  const result=await f.agent.get('/api/sessions').expect(200);
expect(result.body.sessions.some((s:{current:boolean})=>s.current)).toBe(true); expect(JSON.stringify(result.body)).not.toContain(f.cookie);
});
