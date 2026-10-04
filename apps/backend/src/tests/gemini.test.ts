import request from 'supertest';
import type { Express } from 'express';

import { createApp } from '../app';

describe('Gemini BYOK key validation', () => {
  let app: Express;

  beforeAll(() => {
    app = createApp();
  });

  test('rejects a missing key', async () => {
    await request(app).post('/api/gemini/validate').send({}).expect(400);
  });

  test('reports whether a key is valid', async () => {
    const response = await request(app)
      .post('/api/gemini/validate')
      .send({ apiKey: 'test-key-1234567890' })
      .expect(200);

    // AIService is mocked in the test setup to accept any key.
    expect(response.body).toHaveProperty('valid', true);
  });

  test('accepts a per-request key header on the check endpoint', async () => {
    const response = await request(app)
      .get('/api/food-safety/check?pet=dog&food=zorblax-fruit-byok')
      .set('x-gemini-key', 'test-key-1234567890')
      .expect(200);

    expect(response.body).toHaveProperty('safety');
  });
});
