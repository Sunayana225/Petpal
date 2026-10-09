import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { foodSafetyRouter } from '../routes/foodSafety';
import { healthCheck } from '../middleware/errorHandler';

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/food-safety', foodSafetyRouter);
  app.get('/api/health', healthCheck);
  return app;
};

describe('PetPal API Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('Health Check', () => {
    test('GET /api/health should return 200 and health info', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('message', 'PetPal API is running!');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version', '1.0.0');
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
    });
  });

  describe('CORS', () => {
    test('should include CORS headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });
});
