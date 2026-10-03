import request from 'supertest';
import type { Express } from 'express';

import { createApp } from '../app';

/**
 * Covers the endpoints the original suite never touched: search, stats, the
 * caution list and the legacy `/api/check` alias.
 */
describe('Food-safety routes', () => {
  let app: Express;

  beforeAll(() => {
    app = createApp();
  });

  describe('GET /api/food-safety/search', () => {
    test('sweeps every species when no pet is given', async () => {
      const response = await request(app)
        .get('/api/food-safety/search?q=apple')
        .expect(200);

      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('query', 'apple');
    });

    test('narrows to a species when pet is given', async () => {
      const response = await request(app)
        .get('/api/food-safety/search?q=chocolate&pet=dog')
        .expect(200);

      expect(response.body.pet).toBe('dog');
    });

    test('rejects a missing query', async () => {
      await request(app).get('/api/food-safety/search').expect(400);
    });
  });

  describe('GET /api/food-safety/stats', () => {
    test('reports per-species counts and a non-zero total', async () => {
      const response = await request(app).get('/api/food-safety/stats').expect(200);

      expect(response.body.totalEntries).toBeGreaterThan(0);
      expect(response.body.stats).toHaveProperty('dogs');
      expect(Array.isArray(response.body.supportedPets)).toBe(true);
    });
  });

  describe('GET /api/food-safety/caution/:pet', () => {
    test('returns the caution list for a species', async () => {
      const response = await request(app)
        .get('/api/food-safety/caution/dog')
        .expect(200);

      expect(response.body).toHaveProperty('pet', 'dog');
      expect(Array.isArray(response.body.cautionFoods)).toBe(true);
      expect(response.body.count).toBe(response.body.cautionFoods.length);
    });
  });

  describe('legacy GET /api/check', () => {
    test('maps ?animal= onto the check handler', async () => {
      const response = await request(app)
        .get('/api/check?animal=dog&food=chocolate')
        .expect(200);

      expect(response.body).toHaveProperty('pet', 'dog');
      expect(response.body).toHaveProperty('food', 'chocolate');
      expect(response.body).toHaveProperty('safety', 'unsafe');
    });
  });
});
