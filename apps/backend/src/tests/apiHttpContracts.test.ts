import request from 'supertest';
import { createApp } from '../app';
import { fixture } from './fixture';
import { API_VERSION } from '../config/version';
import { openapi } from '../config/openapi';
import express from 'express';
import { FoodSafetyService } from '../services/foodSafetyService';
import { foodSafetyRepository } from '../repositories/foodSafetyRepository';
import { createCheckRouter } from '../routes/foodSafety/check';
import { globalErrorHandler } from '../middleware/errorHandler';
import { errorEnvelope } from '../middleware/errorEnvelope';
import { requestId } from '../middleware/requestId';
import type { FoodSafetyResult } from '../domain/foodSafety';

describe('HTTP boundary contracts', () => {
  const app = createApp();
  test.each(['pet=dog&pet=cat&food=apple', 'pet[]=dog&food=apple', 'pet=dog&food=app%00le', 'pet=dog&food=apple&x%0a=y'])('rejects ambiguous scalar query %s', async query => { await request(app).get(`/api/food-safety/check?${query}`).expect(400); });
  test('bounds parameter count and URL bytes', async () => {
    await request(app).get('/api/info?' + Array.from({ length: 21 }, (_, index) => `q${index}=x`).join('&')).expect(400);
    await request(app).get('/api/info?q=' + 'a'.repeat(4100)).expect(414);
  });
  test.each(['x-http-method-override', 'x-method-override'])('rejects %s', async header => { await request(app).get('/api/info').set(header, 'DELETE').expect(400); });
  test('requires JSON, refuses compressed bodies and bodies on safe methods', async () => {
    await request(app).post('/api/food-safety/check').type('form').send({ pet: 'dog', food: 'apple' }).expect(415);
    await request(app).post('/api/food-safety/check').set('Content-Encoding', 'gzip').send({ pet: 'dog', food: 'apple' }).expect(415);
    await request(app).get('/api/food-safety/check?pet=dog&food=apple').send({ unexpected: true }).expect(400);
  });
  test('negotiates errors without caching them and preserves correlation', async () => {
    const html = await request(app).get('/api/info').set('Accept', 'text/html').expect(406);
    expect(html.headers['cache-control']).toBe('no-store');
    await request(app).get('/api/info').set('Accept', 'application/json;q=0').expect(406);
    await request(app).get('/api/info').set('Accept', 'application/problem+json').expect(406);
    const problem = await request(app).get('/api/food-safety/check').set('Accept', 'application/problem+json, application/json;q=0.9').set('X-Request-Id', 'contract-request').expect(400);
    expect(problem.headers['content-type']).toContain('application/problem+json');
    expect(problem.body).toMatchObject({ type: 'about:blank', status: 400, requestId: 'contract-request' });
    expect(problem.body.detail).toBeTruthy();
    expect(problem.headers['cache-control']).toBe('no-store');
  });
  test('publishes version and exposes headers in CORS with cached preflight', async () => {
    const response = await request(app).get('/api/info').set('Origin', 'http://localhost:3000').expect(200);
    expect(response.headers['x-api-version']).toBe(API_VERSION);
    expect(response.headers['access-control-expose-headers']).toContain('X-Dataset-Revision');
    const preflight = await request(app).options('/api/food-safety/check').set('Origin', 'http://localhost:3000').set('Access-Control-Request-Method', 'POST').expect(200);
    expect(preflight.headers['access-control-max-age']).toBe('600');
  });
  test('rate-limit errors remain readable by allowed browser origins', async () => {
    const previous = process.env.RATE_LIMIT_MAX_REQUESTS;
    try {
      process.env.RATE_LIMIT_MAX_REQUESTS = '1';
      const limited = createApp();
      await request(limited).get('/api/info').expect(200);
      const response = await request(limited).get('/api/info').set('Origin', 'http://localhost:3000').expect(429);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-expose-headers']).toContain('X-Request-Id');
      expect(response.headers['x-api-version']).toBe(API_VERSION);
    } finally { if (previous === undefined) delete process.env.RATE_LIMIT_MAX_REQUESTS; else process.env.RATE_LIMIT_MAX_REQUESTS = previous; }
  });
  test('known routes return method hints and unknown routes remain 404', async () => {
    const response = await request(app).put('/api/food-safety/check').send({ pet: 'dog', food: 'apple' }).expect(405);
    expect(response.headers.allow).toContain('POST');
    const f = await fixture();
    const dataset = await request(f.app).post('/api/v1/food-safety/foods').set('Authorization', `Bearer ${f.rawKey}`).send({}).expect(405);
    expect(dataset.headers.allow).toContain('GET');
    await request(f.app).get('/api/v1/food-safety/nonexistent').set('Authorization', `Bearer ${f.rawKey}`).expect(404);
    const unauthenticated = await request(f.app).get('/api/v1/food-safety/foods').expect(401);
    expect(unauthenticated.headers['www-authenticate']).toContain('Bearer');
  });
});

test('cache saturation yields a correlated retryable 503 rather than more upstream work', async () => {
  const service = new FoodSafetyService(foodSafetyRepository, [], { getServable: () => null, getApproved: () => null, recordAnswer: () => {} });
  let release!: (value: FoodSafetyResult) => void;
  const held = new Promise<FoodSafetyResult>(resolve => { release = resolve; });
  const pending = Array.from({ length: 100 }, (_, index) => service.cache.getOrSet(`held-${index}`, 1000, () => held));
  const app = express();
  app.use(requestId, errorEnvelope, express.json(), createCheckRouter(service), globalErrorHandler);
  try {
    const response = await request(app).post('/check').send({ pet: 'dog', food: 'cache saturation fruit' }).expect(503);
    expect(response.headers['retry-after']).toBe('1');
    expect(response.body.requestId).toBeTruthy();
    expect(response.headers['cache-control']).toBe('no-store');
  } finally {
    release({ pet: 'dog', food: 'held', safety: 'unknown', message: 'held' });
    await Promise.all(pending);
  }
});

test('discovery contracts publish the new routes, limits and runtime version', async () => {
  expect(openapi.info.version).toBe(API_VERSION);
  for (const prefix of ['/food-safety', '/v1/food-safety']) {
    for (const route of ['batch-check', 'compare', 'foods', 'lookup', 'metadata', 'summary', 'sources', 'species', 'autocomplete']) expect(openapi.paths).toHaveProperty(`${prefix}/${route}`);
  }
  expect(openapi.components.schemas.BatchInput.properties.items.maxItems).toBe(20);
  expect(openapi.components.schemas.CompareInput.properties.pets.maxItems).toBe(10);
  expect(openapi.components.schemas.Pagination.properties.limit.maximum).toBe(100);
  const response = await request(createApp()).get('/api/info').expect(200);
  expect(response.body.capabilities.batchChecks).toMatchObject({ maxItems: 20, keyed: true, mode: 'local' });
});
