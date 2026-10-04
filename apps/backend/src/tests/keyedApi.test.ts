import request from 'supertest';
import type { Express } from 'express';

import { createApp } from '../app';
import { userRepository } from '../repositories/userRepository';
import { apiKeyService } from '../services/apiKeyService';

describe('keyed developer API (/api/v1)', () => {
  let app: Express;
  let rawKey: string;

  beforeAll(() => {
    app = createApp();
    const user = userRepository().upsertFromOAuth({
      provider: 'github',
      providerUserId: 'keyed-surface',
      name: 'Keyed Tester',
    });
    rawKey = apiKeyService().create(user.id, 'surface key').rawKey;
  });

  test('without a key → 401', async () => {
    await request(app).get('/api/v1/food-safety/check?pet=dog&food=chocolate').expect(401);
  });

  test('with a valid key → 200 and a verdict', async () => {
    const response = await request(app)
      .get('/api/v1/food-safety/check?pet=dog&food=chocolate')
      .set('Authorization', `Bearer ${rawKey}`)
      .expect(200);

    expect(response.body).toHaveProperty('safety', 'unsafe');
  });

  test('the public endpoint still works with no key', async () => {
    await request(app).get('/api/food-safety/check?pet=dog&food=chocolate').expect(200);
  });

  test('a key over its quota → 429', async () => {
    const user = userRepository().upsertFromOAuth({
      provider: 'github',
      providerUserId: 'keyed-surface',
      name: 'Keyed Tester',
    });
    const limited = apiKeyService().create(user.id, 'tiny quota', {
      quotaLimit: 1,
      quotaWindow: 'day',
    });

    await request(app)
      .get('/api/v1/food-safety/check?pet=dog&food=apple')
      .set('Authorization', `Bearer ${limited.rawKey}`)
      .expect(200);

    await request(app)
      .get('/api/v1/food-safety/check?pet=dog&food=apple')
      .set('Authorization', `Bearer ${limited.rawKey}`)
      .expect(429);
  });
});
