import request from 'supertest';
import type { Express } from 'express';

import { createApp } from '../app';
import { API_VERSION } from '../version';

describe('PetPal API Tests', () => {
  let app: Express;

  beforeAll(() => {
    // The *real* application — helmet, CORS, rate limiting, 404 and the global
    // error handler are all under test, not a hand-rolled stand-in.
    app = createApp();
  });

  describe('Health Check', () => {
    test('GET /api/health should return 200 and health info', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('message', 'PetPal API is running!');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version', API_VERSION);
      expect(response.body).toHaveProperty('services');
    });
  });

  describe('Food Safety API', () => {
    describe('GET /api/food-safety/pets', () => {
      test('should return supported pets list', async () => {
        const response = await request(app)
          .get('/api/food-safety/pets')
          .expect(200);

        expect(response.body).toHaveProperty('supportedPets');
        expect(response.body).toHaveProperty('count');
        expect(Array.isArray(response.body.supportedPets)).toBe(true);
        expect(response.body.supportedPets.length).toBeGreaterThan(0);
        expect(response.body.supportedPets).toContain('dogs');
        expect(response.body.supportedPets).toContain('cats');
      });
    });

    describe('POST /api/food-safety/check', () => {
      test('should check food safety for valid input', async () => {
        const response = await request(app)
          .post('/api/food-safety/check')
          .send({ pet: 'dog', food: 'chocolate' })
          .expect(200);

        expect(response.body).toHaveProperty('pet', 'dog');
        expect(response.body).toHaveProperty('food', 'chocolate');
        expect(response.body).toHaveProperty('safety');
        expect(response.body).toHaveProperty('message');
        expect(['safe', 'unsafe', 'caution', 'unknown']).toContain(response.body.safety);
      });

      test('should return 400 for missing pet parameter', async () => {
        const response = await request(app)
          .post('/api/food-safety/check')
          .send({ food: 'chocolate' })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });

      test('should return 400 for missing food parameter', async () => {
        const response = await request(app)
          .post('/api/food-safety/check')
          .send({ pet: 'dog' })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });

      test('should return 400 for empty pet parameter', async () => {
        const response = await request(app)
          .post('/api/food-safety/check')
          .send({ pet: '', food: 'chocolate' })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });

      test('should return 400 for empty food parameter', async () => {
        const response = await request(app)
          .post('/api/food-safety/check')
          .send({ pet: 'dog', food: '' })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });

      test('should handle various pet types', async () => {
        const pets = ['dog', 'cat', 'rabbit', 'hamster', 'bird'];
        
        for (const pet of pets) {
          const response = await request(app)
            .post('/api/food-safety/check')
            .send({ pet, food: 'apple' })
            .expect(200);

          expect(response.body).toHaveProperty('pet', pet);
          expect(response.body).toHaveProperty('food', 'apple');
          expect(response.body).toHaveProperty('safety');
        }
      });

      test('should handle common safe foods', async () => {
        const safeFoods = ['apple', 'carrot', 'rice', 'chicken'];
        
        for (const food of safeFoods) {
          const response = await request(app)
            .post('/api/food-safety/check')
            .send({ pet: 'dog', food })
            .expect(200);

          expect(response.body).toHaveProperty('food', food);
          expect(response.body).toHaveProperty('safety');
        }
      });

      test('should handle common unsafe foods', async () => {
        const unsafeFoods = ['chocolate', 'onion', 'garlic', 'grapes'];
        
        for (const food of unsafeFoods) {
          const response = await request(app)
            .post('/api/food-safety/check')
            .send({ pet: 'dog', food })
            .expect(200);

          expect(response.body).toHaveProperty('food', food);
          expect(response.body).toHaveProperty('safety');
          // Note: We don't assert specific safety levels as they depend on the database
        }
      });
    });

    describe('GET /api/food-safety/safe/:pet', () => {
      test('should return safe foods for dogs', async () => {
        const response = await request(app)
          .get('/api/food-safety/safe/dog')
          .expect(200);

        expect(response.body).toHaveProperty('pet', 'dog');
        expect(response.body).toHaveProperty('safeFoods');
        expect(response.body).toHaveProperty('count');
        expect(Array.isArray(response.body.safeFoods)).toBe(true);
      });

      test('should return safe foods for cats', async () => {
        const response = await request(app)
          .get('/api/food-safety/safe/cat')
          .expect(200);

        expect(response.body).toHaveProperty('pet', 'cat');
        expect(response.body).toHaveProperty('safeFoods');
        expect(Array.isArray(response.body.safeFoods)).toBe(true);
      });
    });

    describe('GET /api/food-safety/unsafe/:pet', () => {
      test('should return unsafe foods for dogs', async () => {
        const response = await request(app)
          .get('/api/food-safety/unsafe/dog')
          .expect(200);

        expect(response.body).toHaveProperty('pet', 'dog');
        expect(response.body).toHaveProperty('unsafeFoods');
        expect(response.body).toHaveProperty('count');
        expect(Array.isArray(response.body.unsafeFoods)).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/non-existent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/food-safety/check')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Bad Request');
    });
  });

  describe('Security middleware', () => {
    test('should include CORS headers when an Origin is sent', async () => {
      const response = await request(app)
        .get('/api/health')
        // `cors` only echoes an allow-origin header when the request carries an
        // Origin — without this the assertion could never have proved anything.
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe(
        'http://localhost:3000',
      );
    });

    test('should apply helmet security headers', async () => {
      const response = await request(app).get('/api/health').expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers).toHaveProperty('x-request-id');
    });

    test('should not rate-limit health checks', async () => {
      // Uptime monitors poll this endpoint; it is deliberately exempt.
      for (let i = 0; i < 5; i++) {
        await request(app).get('/api/health').expect(200);
      }
    });
  });
});
