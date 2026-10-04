import request from 'supertest';
import type { Express } from 'express';

import { createApp } from '../app';

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
