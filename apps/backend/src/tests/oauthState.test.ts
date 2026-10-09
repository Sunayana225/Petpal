import request from 'supertest';
import { createApp } from '../app';

jest.mock('../config/env', () => {
  const actual = jest.requireActual<typeof import('../config/env')>('../config/env');
  return { ...actual, env: {
    ...actual.env,
    githubClientId: 'state-test-id', githubClientSecret: 'state-test-secret',
    googleClientId: 'state-test-id', googleClientSecret: 'state-test-secret',
  } };
});

describe('OAuth state validation', () => {
  const app = createApp();

  test.each(['github', 'google'])('%s creates unpredictable state and rejects invalid callbacks', async (provider) => {
    const agent = request.agent(app);
    const first = await agent.get(`/api/auth/${provider}`).expect(302);
    const firstState = new URL(first.headers.location).searchParams.get('state');
    expect(firstState).toBeTruthy();
    const second = await agent.get(`/api/auth/${provider}`).expect(302);
    const secondState = new URL(second.headers.location).searchParams.get('state');
    expect(secondState).toBeTruthy();
    expect(secondState).not.toBe(firstState);

    // Invalid state fails locally, before an outbound token exchange.
    const invalid = await agent.get(`/api/auth/${provider}/callback?code=fake&state=wrong`).expect(302);
    expect(invalid.headers.location).toContain('/login?error=state');
    const missing = await agent.get(`/api/auth/${provider}/callback?code=fake`).expect(302);
    expect(missing.headers.location).toContain('/login?error=state');
    expect((await agent.get('/api/auth/me')).body.user).toBeNull();
  });
});
