import request from 'supertest';
import type { Express } from 'express';

import { createApp } from '../app';

describe('Admin review queue', () => {
  let app: Express;
  const previousToken = process.env.ADMIN_TOKEN;

  beforeAll(() => {
    process.env.ADMIN_TOKEN = 'test-admin-token';
    app = createApp();
  });

  afterAll(() => {
    if (previousToken === undefined) {
      delete process.env.ADMIN_TOKEN;
    } else {
      process.env.ADMIN_TOKEN = previousToken;
    }
  });

  test('refuses requests with no token', async () => {
    await request(app).get('/api/admin/queue').expect(401);
  });

  test('refuses requests with the wrong token', async () => {
    await request(app)
      .get('/api/admin/queue')
      .set('x-admin-token', 'not-the-token')
      .expect(401);
  });

  test('lists the queue with a valid token', async () => {
    const response = await request(app)
      .get('/api/admin/queue')
      .set('x-admin-token', 'test-admin-token')
      .expect(200);

    expect(response.body).toHaveProperty('stats');
    expect(Array.isArray(response.body.records)).toBe(true);
  });

  test('validates the status filter', async () => {
    await request(app)
      .get('/api/admin/queue?status=bogus')
      .set('x-admin-token', 'test-admin-token')
      .expect(400);
  });

  test('returns 404 for an unknown record id', async () => {
    await request(app)
      .post('/api/admin/queue/does-not-exist/approve')
      .set('x-admin-token', 'test-admin-token')
      .expect(404);
  });
});
