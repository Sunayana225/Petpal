import { parseAssessment } from '../services/aiAssessment';
import { ExternalApiService } from '../services/externalApiService';
import { OpenPetFoodFactsSource } from '../services/answerSources';
import { FoodSafetyRepository } from '../repositories/foodSafetyRepository';
import { FoodSafetyService } from '../services/foodSafetyService';
import { DurableAnswerCache } from '../services/answerCache';
import { AiAnswerRepository } from '../repositories/aiAnswerRepository';
import { createDatabase } from '../db/database';
import { env } from '../config/env';
import * as dataFiles from '../utils/dataFiles';

jest.unmock('../services/externalApiService');

describe('fail-closed structured AI assessments', () => {
  test.each([
    'This food is not considered safe. It is toxic and dangerous.',
    '{"safety":"safe","description":"Toxic and dangerous","hazardPresent":false}',
    '{"safety":"safe","description":"safe","hazardPresent":true}',
    '{"safety":"unsafe","description":"hazard","hazardPresent":false}',
    '{"safety":"unsafe","safety":"safe","description":"test","hazardPresent":false}',
    '{"safety":"safe","description":"test"}',
    '{"safety":"safe","description":"test","hazardPresent":false,"extra":true}',
    'null', '[]', '```json\n{}\n```',
  ])('rejects malformed or contradictory assessment %s', text => expect(parseAssessment(text)).toBeNull());
  test('accepts a validated explicit schema without guessing a verdict from words', () => {
    expect(parseAssessment(JSON.stringify({ safety: 'unsafe', description: 'Known hazard', hazardPresent: true }))?.safety).toBe('unsafe');
    expect(parseAssessment(JSON.stringify({ safety: 'safe', description: 'Publisher reports suitability with preparation limits.', hazardPresent: false }))?.safety).toBe('safe');
  });
  test('real AI transport requests the schema and refuses a free-text upstream warning', async () => {
    const { AIService } = jest.requireActual<typeof import('../services/aiService')>('../services/aiService');
    const mock = jest.spyOn(global, 'fetch').mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      expect(body.generationConfig.responseMimeType).toBe('application/json');
      expect(body.generationConfig.responseJsonSchema.required).toEqual(['safety', 'description', 'hazardPresent']);
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'This food is not considered safe. It is toxic and dangerous.' }] } }] }), { headers: { 'Content-Type': 'application/json' } });
    });
    try { expect((await AIService.getFoodSafetyAdvice('fixture-food', 'dogs', 'test-only-key')).safety).toBe('unknown'); }
    finally { mock.mockRestore(); }
  });
});

test('dog-food catalog metadata does not imply safe for rabbits', async () => {
  const mock = jest.spyOn(global, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ products: [{ product_name: 'Example dog kibble', ingredients_text: 'beef, rice', categories: 'pet food, dog food' }] }), { headers: { 'Content-Type': 'application/json' } }));
  try {
    const result = await new OpenPetFoodFactsSource().resolve('rabbits', 'rabbits', 'Example dog kibble');
    expect(result).toMatchObject({ pet: 'rabbits', safety: 'unknown', source: 'external' });
    expect(result?.details?.recommendation).toContain('does not establish safety');
    expect(await ExternalApiService.searchPetFood('Example dog kibble')).toMatchObject({ safety: 'unknown' });
  } finally { mock.mockRestore(); }
});

describe('production review policy', () => {
  let before: NodeJS.ProcessEnv;
  beforeEach(() => { before = { ...process.env }; process.env.NODE_ENV = 'production'; delete process.env.AI_CACHE_SERVE_UNREVIEWED; });
  afterEach(() => { process.env = before; });
  test('excludes legacy/demo datasets from production', () => {
    const repository = new FoodSafetyRepository();
    const records = repository.getSupportedPets().flatMap(pet => repository.getFoods(pet));
    expect(records.length).toBeGreaterThan(0);
    expect(records.every(record => record.source === 'BioVet (CC BY 4.0)' && record.evidence?.length)).toBe(true);
    expect(repository.search('chocolate', 'dogs')?.safety).toBe('unsafe');
    expect(env.serveUnreviewedAi).toBe(false);
    process.env.AI_CACHE_SERVE_UNREVIEWED = 'true';
    expect(env.serveUnreviewedAi).toBe(false);
  });
  test('missing production sources stop startup rather than silently serving demo data', () => {
    const mock = jest.spyOn(dataFiles, 'readJsonFile').mockReturnValue({});
    try { expect(() => new FoodSafetyRepository()).toThrow('Production source dataset is missing or invalid'); }
    finally { mock.mockRestore(); }
  });
  test('quarantines fresh, cached and BYOK assessments, then serves only current approved schema', async () => {
    const db = createDatabase(':memory:');
    try {
      const repo = new AiAnswerRepository(db), cache = new DurableAnswerCache(repo);
      const repository = new FoodSafetyRepository();
      const service = new FoodSafetyService(repository, [{ source: 'ai', resolve: async (_key, pet, food) => ({ pet, food, safety: 'safe', assessmentVersion: 'structured-v1', source: 'ai', message: 'assessment' }) }], cache);
      for (const options of [{}, {}, { apiKey: 'test-only-key' }]) expect((await service.checkFoodSafety('dogs', 'production-review-fixture', options)).safety).toBe('unknown');
      const pending = cache.list('pending');
      expect(pending).toHaveLength(1);
      cache.approve(pending[0].id);
      expect((await service.checkFoodSafety('dogs', 'production-review-fixture')).safety).toBe('safe');
      expect((await service.checkFoodSafety('dogs', 'production-review-fixture', { apiKey: 'test-only-key' })).safety).toBe('safe');
    } finally { db.close(); }
  });
  test('legacy approved catalog and free-text AI results cannot bypass production review', () => {
    const db = createDatabase(':memory:');
    try {
      const repo = new AiAnswerRepository(db), cache = new DurableAnswerCache(repo);
      for (const source of ['external', 'ai'] as const) {
        repo.save({ pet: 'dogs', food: source, safety: 'safe', source, status: 'approved', ttlMs: null, payload: { pet: 'dogs', food: source, safety: 'safe', source, message: 'legacy' } });
        expect(cache.getServable('dogs', source)?.safety).toBe('unknown');
        expect(cache.getApproved('dogs', source)).toBeNull();
        cache.recordAnswer('dogs', { pet: 'dogs', food: source, safety: 'unknown', source: 'none', message: 'fresh metadata' });
        expect(cache.getServable('dogs', source)?.safety).toBe('unknown');
      }
      repo.save({ pet: 'dogs', food: 'cached-safe', safety: 'safe', source: 'ai', status: 'cached', ttlMs: null, payload: { pet: 'dogs', food: 'cached-safe', safety: 'safe', source: 'ai', assessmentVersion: 'structured-v1', message: 'unapproved' } });
      expect(cache.getServable('dogs', 'cached-safe')?.safety).toBe('unknown');
    } finally { db.close(); }
  });
  test('without a durable store a live assessment is still withheld', async () => {
    const service = new FoodSafetyService(new FoodSafetyRepository(), [{ source: 'ai', resolve: async (_key, pet, food) => ({ pet, food, safety: 'safe', source: 'ai', message: 'unreviewed' }) }], undefined);
    // Explicitly remove the default store to exercise the fail-closed branch.
    Object.assign(service, { durable: undefined });
    expect((await service.checkFoodSafety('dogs', 'production-no-store-fixture')).safety).toBe('unknown');
  });
});
