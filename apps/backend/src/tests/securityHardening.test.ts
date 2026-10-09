import request from 'supertest';
import { createApp } from '../app';
import { env } from '../config/env';

describe('API and login hardening', () => {
  const app = createApp();

  test('production dev login cannot be reenabled by DEV_AUTH', () => {
    const previous = { node: process.env.NODE_ENV, dev: process.env.DEV_AUTH };
    try {
      process.env.NODE_ENV = 'production';
      process.env.DEV_AUTH = '1';
      expect(env.devAuthEnabled).toBe(false);
    } finally {
      process.env.NODE_ENV = previous.node;
      if (previous.dev === undefined) delete process.env.DEV_AUTH;
      else process.env.DEV_AUTH = previous.dev;
    }
  });

  test.each([{ email: 'invalid' }, { email: {} }, { name: ['name'] }, { name: ' ' }])(
    'rejects malformed dev identities: %j', async (body) => {
      await request(app).post('/api/auth/dev-login').send(body).expect(400);
    },
  );

  test('logout clears the cookie and authenticated identity', async () => {
    const agent = request.agent(app);
    const login = await agent.post('/api/auth/dev-login').send({}).expect(200);
    expect(login.headers['cache-control']).toBe('no-store');
    const logout = await agent.post('/api/auth/logout').set('x-csrf-token', login.body.csrfToken).expect(200);
    expect(String(logout.headers['set-cookie'])).toContain('petpal.sid=;');
    expect((await agent.get('/api/auth/me')).body.user).toBeNull();
  });

  test('rejects originless browser cross-site writes', async () => {
    await request(app).post('/api/auth/dev-login')
      .set('Sec-Fetch-Site', 'cross-site').send({}).expect(403);
  });

  test('same-origin requires the protocol to match', async () => {
    await request(app).post('/api/auth/dev-login').set('Host', 'api.example.com')
      .set('Origin', 'https://api.example.com').send({}).expect(403);
  });

  test('parser errors preserve request correlation', async () => {
    const response = await request(app).post('/api/auth/dev-login')
      .set('X-Request-Id', 'parser-test').set('Content-Type', 'application/json')
      .send('{bad').expect(400);
    expect(response.headers['x-request-id']).toBe('parser-test');
    expect(response.body.requestId).toBe('parser-test');
  });

  test('key updates reject string booleans; usage dates must be valid', async () => {
    const agent = request.agent(app);
    const login = await agent.post('/api/auth/dev-login').send({}).expect(200);
    agent.set('x-csrf-token', login.body.csrfToken);
    const created = await agent.post('/api/me/keys').send({ name: 'hardening' }).expect(201);
    expect(created.headers['cache-control']).toBe('no-store');
    await agent.patch(`/api/me/keys/${created.body.key.id}`).send({ enabled: 'false' }).expect(400);
    await agent.get('/api/me/usage?since=garbage').expect(400);
    await agent.get(`/api/me/keys/${created.body.key.id}/usage?since=garbage`).expect(400);
    await agent.delete(`/api/me/keys/${created.body.key.id}`).expect(200);
  });

  test('unconfigured callbacks return a controlled unavailable response', async () => {
    if (!process.env.GITHUB_CLIENT_ID) {
      await request(app).get('/api/auth/github/callback?code=test').expect(503);
    }
  });
});
