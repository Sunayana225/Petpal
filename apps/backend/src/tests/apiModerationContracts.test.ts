import request from 'supertest';
import { createDatabase, getDb } from '../db/database';
import { AiAnswerRepository } from '../repositories/aiAnswerRepository';
import { DurableAnswerCache } from '../services/answerCache';
import { FoodSafetyService } from '../services/foodSafetyService';
import { foodSafetyRepository } from '../repositories/foodSafetyRepository';
import type { FoodSafetyResult } from '../domain/foodSafety';
import { createApp } from '../app';
import { randomUUID } from 'crypto';
import { existsSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const payload: FoodSafetyResult = { pet: 'dogs', food: 'test moderation fruit', safety: 'caution', message: 'unreviewed', source: 'ai' };
describe('moderation freshness across cache layers', () => {
  const db = createDatabase(':memory:');
  const repo = new AiAnswerRepository(db);
  afterAll(() => db.close());
  test('another cache instance review invalidates hot service and durable caches', async () => {
    const writer = new DurableAnswerCache(repo); writer.recordAnswer('dogs', payload);
    const reader = new DurableAnswerCache(repo);
    const resolve = jest.fn();
    const service = new FoodSafetyService(foodSafetyRepository, [{ source: 'ai', resolve }], reader);
    expect((await service.checkFoodSafety('dog', payload.food)).safety).toBe('caution');
    const row = repo.find('dogs', payload.food)!;
    writer.reject(row.id);
    expect((await service.checkFoodSafety('dog', payload.food)).safety).toBe('unknown');
    expect(resolve).not.toHaveBeenCalled();
    expect(repo.find('dogs', payload.food)?.expiresAt).toBeNull();
  });
  test('fresh captures cannot overwrite approved or rejected payloads', () => {
    const cache = new DurableAnswerCache(repo);
    for (const status of ['approved', 'rejected'] as const) {
      const food = `protected ${status} fruit`; cache.recordAnswer('dogs', { ...payload, food });
      const row = repo.find('dogs', food)!; repo.setStatus(row.id, status);
      cache.recordAnswer('dogs', { ...payload, food, safety: 'safe', message: 'new guess' });
      expect(repo.find('dogs', food)?.payload.safety).toBe('caution');
      expect(cache.getServable('dogs', food)?.safety).toBe(status === 'approved' ? 'caution' : 'unknown');
    }
  });
  test('policy changes invalidate pending guesses in an existing service', async () => {
    const previous = process.env.AI_CACHE_SERVE_UNREVIEWED;
    try {
      process.env.AI_CACHE_SERVE_UNREVIEWED = 'true';
      const cache = new DurableAnswerCache(repo); const food = 'policy moderation fruit'; cache.recordAnswer('dogs', { ...payload, food });
      const service = new FoodSafetyService(foodSafetyRepository, [], cache);
      expect((await service.checkFoodSafety('dog', food)).safety).toBe('caution');
      process.env.AI_CACHE_SERVE_UNREVIEWED = 'false';
      expect((await service.checkFoodSafety('dog', food)).safety).toBe('unknown');
    } finally { if (previous === undefined) delete process.env.AI_CACHE_SERVE_UNREVIEWED; else process.env.AI_CACHE_SERVE_UNREVIEWED = previous; }
  });
  test('hot cache never outlives durable row expiry', () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1000);
    try {
      const row = repo.save({ pet: 'dogs', food: 'expiring moderation fruit', safety: 'caution', payload, source: 'ai', status: 'pending', ttlMs: 10 });
      const cache = new DurableAnswerCache(repo); expect(cache.getServable(row.pet, row.food)).not.toBeNull();
      now.mockReturnValue(1010); expect(cache.getServable(row.pet, row.food)).toBeNull();
    } finally { now.mockRestore(); }
  });
  test('independent SQLite connections observe committed review decisions', () => {
    const path = join(tmpdir(), `petpal-review-${randomUUID()}.db`);
    const first = createDatabase(path);
    const second = createDatabase(path);
    try {
      const writer = new DurableAnswerCache(new AiAnswerRepository(first));
      const reader = new DurableAnswerCache(new AiAnswerRepository(second));
      writer.recordAnswer('dogs', payload);
      expect(reader.getServable('dogs', payload.food)?.safety).toBe('caution');
      const row = new AiAnswerRepository(first).find('dogs', payload.food)!;
      writer.reject(row.id);
      expect(reader.getServable('dogs', payload.food)?.safety).toBe('unknown');
    } finally {
      second.close(); first.close();
      for (const file of [path, `${path}-wal`, `${path}-shm`]) if (existsSync(file)) unlinkSync(file);
    }
  });
});
describe('admin cache and queue contracts', () => {
  const previous = process.env.ADMIN_TOKEN;
  beforeAll(() => { process.env.ADMIN_TOKEN = 'api-contract-admin'; });
  afterAll(() => { if (previous === undefined) delete process.env.ADMIN_TOKEN; else process.env.ADMIN_TOKEN = previous; });
  const app = createApp();
  test('cache controls require admin and keep durable rows', async () => {
    await request(app).get('/api/admin/cache').expect(401);
    const before = getDb().prepare('SELECT COUNT(*) AS n FROM ai_answers').get();
    const diagnostic = await request(app).get('/api/admin/cache').set('x-admin-token', 'api-contract-admin').expect(200);
    expect(diagnostic.body.food).toHaveProperty('inflight');
    await request(app).delete('/api/admin/cache').set('x-admin-token', 'api-contract-admin').expect(200);
    expect(getDb().prepare('SELECT COUNT(*) AS n FROM ai_answers').get()).toEqual(before);
  });
  test('queue is bounded and cannot approve unknown cached answers', async () => {
    const repo = new AiAnswerRepository(getDb());
    const row = repo.save({ pet: 'test', food: 'contract unknown', safety: 'unknown', payload: { ...payload, safety: 'unknown' }, source: 'none', status: 'cached', ttlMs: 10000 });
    const queue = await request(app).get('/api/admin/queue?limit=1').set('x-admin-token', 'api-contract-admin').expect(200);
    expect(queue.body.records.length).toBeLessThanOrEqual(1); expect(queue.body.pagination.limit).toBe(1);
    await request(app).post(`/api/admin/queue/${row.id}/approve`).set('x-admin-token', 'api-contract-admin').expect(409);
    await request(app).get('/api/admin/queue?limit=101').set('x-admin-token', 'api-contract-admin').expect(400);
    await request(app).get('/api/admin/queue?unexpected=1').set('x-admin-token', 'api-contract-admin').expect(400);
  });
});
