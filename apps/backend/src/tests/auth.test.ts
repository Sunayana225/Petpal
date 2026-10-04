import request from 'supertest';
import type { Express } from 'express';

import { createApp } from '../app';

/** The `petpal.sid` value a response set, if any. */
function sessionId(response: { headers: Record<string, unknown> }): string | undefined {
  const raw = response.headers['set-cookie'];
  const cookies = Array.isArray(raw) ? (raw as string[]) : typeof raw === 'string' ? [raw] : [];
  const cookie = cookies.find((entry) => entry.startsWith('petpal.sid='));
  return cookie?.split(';')[0]?.split('=')[1];
}

describe('auth surface', () => {
  let app: Express;
  const saved = {
    githubId: process.env.GITHUB_CLIENT_ID,
    githubSecret: process.env.GITHUB_CLIENT_SECRET,
  };

  beforeAll(() => {
    // Ensure the "not configured" paths are actually exercised.
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;
    app = createApp();
  });

  afterAll(() => {
    if (saved.githubId !== undefined) process.env.GITHUB_CLIENT_ID = saved.githubId;
    if (saved.githubSecret !== undefined) process.env.GITHUB_CLIENT_SECRET = saved.githubSecret;
  });

  test('GET /api/auth/me returns null when signed out', async () => {
    const response = await request(app).get('/api/auth/me').expect(200);
    expect(response.body).toHaveProperty('user', null);
  });

  test('GET /api/auth/providers reports what this server can offer', async () => {
    const response = await request(app).get('/api/auth/providers').expect(200);

    // This suite runs with the GitHub credentials removed.
    expect(response.body.providers).toEqual({ github: false, google: false });
    expect(response.body.dev).toBe(true); // dev sign-in is on outside production
    // The exact callback URL an operator has to register.
    expect(response.body.callbackBase).toMatch(/^https?:\/\//);
  });

  test('GET /api/auth/providers reflects configured credentials', async () => {
    process.env.GITHUB_CLIENT_ID = 'test-client-id';
    process.env.GITHUB_CLIENT_SECRET = 'test-client-secret';
    try {
      const response = await request(app).get('/api/auth/providers').expect(200);
      expect(response.body.providers.github).toBe(true);
    } finally {
      delete process.env.GITHUB_CLIENT_ID;
      delete process.env.GITHUB_CLIENT_SECRET;
    }
  });

  test('a sign-in establishes a session that /me and /logout round-trip', async () => {
    const agent = request.agent(app);

    const login = await agent
      .post('/api/auth/dev-login')
      .send({ name: 'Session Tester' })
      .expect(200);
    expect(login.body.user).toHaveProperty('provider', 'dev');

    const me = await agent.get('/api/auth/me').expect(200);
    expect(me.body.user).toHaveProperty('name', 'Session Tester');

    await agent.post('/api/auth/logout').expect(200);

    const after = await agent.get('/api/auth/me').expect(200);
    expect(after.body.user).toBeNull();
  });

  test('signing in rotates the session id (no fixation)', async () => {
    const agent = request.agent(app);

    const first = await agent.post('/api/auth/dev-login').send({ name: 'First' }).expect(200);
    const second = await agent.post('/api/auth/dev-login').send({ name: 'Second' }).expect(200);

    const firstId = sessionId(first);
    const secondId = sessionId(second);

    expect(firstId).toBeTruthy();
    expect(secondId).toBeTruthy();
    // A new session id on every sign-in: an id held before authenticating can
    // never become an authenticated one.
    expect(secondId).not.toBe(firstId);
  });

  test('GET /api/auth/:provider 404s for an unknown provider', async () => {
    await request(app).get('/api/auth/facebook').expect(404);
  });

  test('GET /api/auth/github 503s when the provider is not configured', async () => {
    await request(app).get('/api/auth/github').expect(503);
  });

  test('POST /api/auth/logout succeeds when signed out', async () => {
    await request(app).post('/api/auth/logout').expect(200);
  });

  test('dev-login signs in outside production', async () => {
    const response = await request(app)
      .post('/api/auth/dev-login')
      .send({ name: 'Dev Tester' })
      .expect(200);

    expect(response.body.user).toHaveProperty('provider', 'dev');
    expect(response.body.user).toHaveProperty('role', 'user');
  });

  test('dev-login is refused in production', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      await request(app).post('/api/auth/dev-login').send({}).expect(404);
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  test('admin routes still refuse anonymous callers (no token, no session)', async () => {
    await request(app).get('/api/admin/queue').expect(401);
  });
});
