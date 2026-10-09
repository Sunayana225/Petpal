import request from 'supertest';
import { FoodSafetyService } from '../services/foodSafetyService';
import { fixture } from './fixture';

describe('local bulk contracts', () => {
  let f: Awaited<ReturnType<typeof fixture>>;
  beforeAll(async () => { f = await fixture(); });
  const post = (path: string, body: object) => request(f.app).post(`/api/v1/food-safety/${path}`).set('Authorization', `Bearer ${f.rawKey}`).send(body);
  test('batch preserves order and duplicates while reporting distinct normalized pairs', async () => {
    const lookups = jest.spyOn(FoodSafetyService.prototype, 'checkLocal');
    const response = await post('batch-check', { items: [{ pet: 'dog', food: 'chocolate' }, { pet: 'cat', food: 'apple' }, { pet: 'dogs', food: 'Chocolate' }] }).expect(200);
    expect(response.body).toMatchObject({ count: 3, uniqueChecks: 2, mode: 'local' });
    expect(response.body.results.map((result: { inputIndex: number }) => result.inputIndex)).toEqual([0, 1, 2]);
    expect(response.body.results[2]).toMatchObject({ pet: 'dogs', food: 'Chocolate', safety: 'unsafe' });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(lookups).toHaveBeenCalledTimes(2); lookups.mockRestore();
  });
  test.each([{}, { items: [] }, { items: {} }, { items: Array.from({ length: 21 }, () => ({ pet: 'dog', food: 'apple' })) }, { items: [{ pet: 'dog', food: 'apple' }, { pet: 1, food: 'apple' }] }, { items: [{ pet: 'dog', food: 'apple', mode: 'auto' }] }, { items: [{ pet: 'dog', food: 'apple' }], extra: true }])('rejects malformed batch %j', async body => { await post('batch-check', body).expect(400); });
  test('comparison orders results and groups verdicts', async () => {
    const response = await post('compare', { food: 'chocolate', pets: ['dog', 'cat'] }).expect(200);
    expect(response.body.results.map((result: { pet: string }) => result.pet)).toEqual(['dog', 'cat']);
    expect(response.body.bySafety.unsafe).toEqual(['dog', 'cat']);
    expect(response.body.consistent).toBe(true);
  });
  test.each([{ food: 'apple', pets: [] }, { food: {}, pets: ['dog'] }, { food: 'apple', pets: ['dog', 'dogs'] }, { food: 'apple', pets: ['tiger'] }, { food: 'apple', pets: Array(11).fill('dog') }, { food: 'apple', pets: ['dog'], extra: 1 }])('rejects malformed comparison %j', async body => { await post('compare', body).expect(400); });
  test.each(['batch-check', 'compare'])('requires credentials and rejects BYOK on %s', async path => {
    const body = path === 'compare' ? { food: 'apple', pets: ['dog'] } : { items: [{ pet: 'dog', food: 'apple' }] };
    await request(f.app).post(`/api/food-safety/${path}`).send(body).expect(401);
    await post(path, body).set('x-gemini-key', '0123456789abcd').expect(400);
    await request(f.app).get(`/api/v1/food-safety/${path}`).set('Authorization', `Bearer ${f.rawKey}`).expect(405);
  });
  test('bulk routes require check scope on case-insensitive paths', async () => {
    await f.agent.patch(`/api/me/keys/${f.key.id}`).send({ scope: 'dataset' }).expect(200);
    await post('BATCH-CHECK/', { items: [{ pet: 'dog', food: 'apple' }] }).expect(403);
    await post('COMPARE/', { food: 'apple', pets: ['dog'] }).expect(403);
    await f.agent.patch(`/api/me/keys/${f.key.id}`).send({ scope: 'check' }).expect(200);
    await post('batch-check', { items: [{ pet: 'dog', food: 'apple' }] }).expect(200);
    await request(f.app).get('/api/v1/food-safety/metadata').set('Authorization', `Bearer ${f.rawKey}`).expect(403);
  });
});
