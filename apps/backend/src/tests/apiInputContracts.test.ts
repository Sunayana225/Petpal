import request from 'supertest';
import { createApp } from '../app';
import { FoodSafetyService } from '../services/foodSafetyService';
import { foodSafetyRepository } from '../repositories/foodSafetyRepository';

const app = createApp();
describe('strict single-check contracts', () => {
  test.each([[], null, { pet: 2, food: 'apple' }, { pet: 'dog', food: {} }, { pet: 'dog', food: ['apple'] }, { pet: 'dog\n', food: 'apple' }, { pet: 'dog', food: 'app\u0000le' }, { pet: 'dog', food: 'apple', secret: 'never echo' }, { pet: 'dog', food: '!!!' }, { pet: 'dog', food: 'a'.repeat(101) }, { pet: 'a'.repeat(51), food: 'apple' }, { pet: 'dog', food: 'apple', mode: 'remote' }])('rejects ambiguous input %j', async body => {
    const response = await request(app).post('/api/food-safety/check').set('Content-Type', 'application/json').send(JSON.stringify(body)).expect(400);
    expect(response.body.requestId).toBeTruthy();
    expect(JSON.stringify(response.body)).not.toContain('never echo');
  });
  test('normalizes compatibility Unicode and spaces before the local lookup', async () => {
    const response = await request(app).post('/api/food-safety/check').send({ pet: ' ｄｏｇ ', food: ' ＣＨＯＣＯＬＡＴＥ ', mode: 'local' }).expect(200);
    expect(response.body).toMatchObject({ pet: 'dog', food: 'CHOCOLATE', safety: 'unsafe', source: 'database' });
  });
  test('local mode never invokes remote sources even for an unknown species', async () => {
    const resolve = jest.fn();
    const service = new FoodSafetyService(foodSafetyRepository, [{ source: 'ai', resolve }], undefined);
    expect(service.checkLocal('tiger', 'new fruit')).toMatchObject({ safety: 'unknown', source: 'none' });
    expect(resolve).not.toHaveBeenCalled();
  });
  test('rejects a Gemini credential in local mode', async () => {
    await request(app).post('/api/food-safety/check').set('x-gemini-key', '0123456789abcd').send({ pet: 'dog', food: 'apple', mode: 'local' }).expect(400);
  });
});
describe('legacy validation', () => {
  test.each(['animal=dog', 'food=apple', 'animal=dog&food=', 'animal=dog&food=' + 'a'.repeat(101), 'animal=' + 'a'.repeat(51) + '&food=apple', 'animal=dog&pet=cat&food=apple', 'animal=dog&food=apple&extra=1', 'animal=dog&food=%21%21%21', 'animal=dog&food=apple&mode=bad'])('rejects legacy query %s', async query => {
    await request(app).get(`/api/check?${query}`).expect(400);
  });
  test('animal alias and local mode produce the same verdict as the new route', async () => {
    const legacy = await request(app).get('/api/check?animal=dog&food=chocolate&mode=local').expect(200);
    const modern = await request(app).get('/api/food-safety/check?pet=dog&food=chocolate&mode=local').expect(200);
    expect(legacy.body.safety).toBe(modern.body.safety);
    expect(legacy.body.pet).toBe('dog');
  });
});
