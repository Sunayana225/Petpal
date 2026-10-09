import { fixture } from './fixture';

test('unlinking the final sign-in method is refused', async () => {
  const f = await fixture();
  await f.agent.delete('/api/auth/account/identities/dev').expect(409);
});
