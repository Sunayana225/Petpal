import request from 'supertest';
import { fixture } from './fixture';
import { foodSafetyRepository } from '../repositories/foodSafetyRepository';

describe('bounded dataset contracts', () => {
  let f: Awaited<ReturnType<typeof fixture>>;
  const previous = { burst: process.env.KEY_BURST_LIMIT, rate: process.env.RATE_LIMIT_MAX_REQUESTS };
  beforeAll(async () => { process.env.KEY_BURST_LIMIT = '1000'; process.env.RATE_LIMIT_MAX_REQUESTS = '10000'; f = await fixture(); });
  afterAll(() => {
    for (const [name, value] of [['KEY_BURST_LIMIT', previous.burst], ['RATE_LIMIT_MAX_REQUESTS', previous.rate]]) { if (value === undefined) delete process.env[name!]; else process.env[name!] = value; }
  });
  const get = (path: string) => request(f.app).get(`/api/v1/food-safety/${path}`).set('Authorization', `Bearer ${f.rawKey}`);
  test('defaults to bounded ordered pages and distinguishes total from count', async () => {
    const response = await get('foods').expect(200);
    expect(response.body.count).toBeLessThanOrEqual(100);
    expect(response.body.pagination.total).toBe(foodSafetyRepository.totalEntries);
    expect(response.body.pagination).toMatchObject({ limit: 100, offset: 0 });
    expect(response.headers['x-dataset-revision']).toBe(response.body.revision);
  });
  test.each(['limit=0', 'limit=101', 'offset=-1', 'offset=100001', 'limit=1.5', 'limit=1e2', 'limit=01', 'offset=00', 'cursor=@@', 'cursor=' + 'a'.repeat(1025), 'sort=bad', 'order=bad', 'pet=tiger', 'safety=unknown', 'severity=urgent', 'has=bad', 'match=bad&q=apple', 'match=exact', 'fields=unknown', 'fields=source,source', 'fields=description,symptoms,benefits,severity,alternatives,preparation,recommendation,caution,source,brand,barcode', 'unexpected=1'])('rejects dataset query %s', async query => { await get(`foods?${query}`).expect(400); });
  test('out-of-range offset gives an empty final page', async () => {
    const response = await get('foods?offset=100000').expect(200);
    expect(response.body.foods).toEqual([]);
    expect(response.body.pagination).toMatchObject({ hasNext: false, nextCursor: null });
  });
  test('cursor walks disjoint stable pages and rejects different filters', async () => {
    const first = await get('foods?pet=dog&limit=2').expect(200);
    const cursor = first.body.pagination.nextCursor;
    expect(first.headers.link).toContain('rel="next"');
    const second = await get(`foods?pet=dogs&limit=2&cursor=${cursor}`).expect(200);
    expect(second.body.pagination.offset).toBe(2);
    expect(new Set([...first.body.foods, ...second.body.foods].map((item: { food: string }) => item.food)).size).toBe(4);
    await get(`foods?pet=cat&limit=2&cursor=${cursor}`).expect(400);
    await get(`foods?pet=dog&cursor=${cursor}&offset=0`).expect(400);
  });
  test('cursor rejects unsupported versions and unsafe positions', async () => {
    const first = await get('foods?pet=dog&limit=2').expect(200);
    const decode = JSON.parse(Buffer.from(first.body.pagination.nextCursor, 'base64url').toString());
    for (const change of [{ v: 2 }, { offset: -1 }, { offset: Number.MAX_SAFE_INTEGER }, { fingerprint: null }]) {
      await get(`foods?pet=dog&cursor=${Buffer.from(JSON.stringify({ ...decode, ...change })).toString('base64url')}`).expect(400);
    }
  });
  test('cursor detects changed dataset revision', async () => {
    const first = await get('foods?pet=dog&limit=2').expect(200);
    const decode = JSON.parse(Buffer.from(first.body.pagination.nextCursor, 'base64url').toString());
    await get(`foods?pet=dog&cursor=${Buffer.from(JSON.stringify({ ...decode, revision: 'old' })).toString('base64url')}`).expect(409);
  });
  test.each(['safe', 'caution', 'unsafe'])('bounds %s category pages and rejects contradictory filters', async category => {
    const response = await get(`${category}/dog?limit=2`).expect(200);
    expect(response.body[`${category}Foods`].length).toBeLessThanOrEqual(2);
    await get(`${category}/dog?pet=cat`).expect(400);
    await get(`${category}/dog?safety=${category === 'safe' ? 'unsafe' : 'safe'}`).expect(400);
    await get(`${category}/tiger`).expect(400);
  });
  test.each(['safe', 'unsafe', 'caution'])('filters safety %s', async safety => {
    const response = await get(`foods?safety=${safety}`).expect(200);
    expect(response.body.foods.length).toBeGreaterThan(0);
    expect(response.body.foods.every((item: { safety: string }) => item.safety === safety)).toBe(true);
  });
  test.each(['symptoms', 'benefits', 'alternatives', 'preparation', 'recommendation', 'ingredients'])('filters presence of %s', async field => {
    const response = await get(`foods?has=${field}`).expect(200);
    expect(response.body.foods.every((item: Record<string, unknown>) => Array.isArray(item[field]) ? (item[field] as unknown[]).length > 0 : Boolean(item[field]))).toBe(true);
  });
  test.each(['low', 'medium', 'high'])('filters severity %s', async severity => {
    const response = await get(`foods?severity=${severity}`).expect(200);
    expect(response.body.foods.every((item: { severity: string }) => item.severity === severity)).toBe(true);
  });
  test.each(['food', 'pet', 'safety', 'severity', 'source'])('sorts %s in both directions with stable ties', async sort => {
    const asc = await get(`foods?pet=dog&sort=${sort}&order=asc`).expect(200);
    const repeat = await get(`foods?pet=dog&sort=${sort}&order=asc`).expect(200);
    const desc = await get(`foods?pet=dog&sort=${sort}&order=desc`).expect(200);
    expect(asc.body.foods).toEqual(repeat.body.foods);
    expect(desc.body.count).toBe(asc.body.count);
    if (sort === 'food' && !asc.body.pagination.hasNext) expect(desc.body.foods).toEqual([...asc.body.foods].reverse());
  });
  test('projects requested data while retaining core identity and omitting missing fields', async () => {
    const response = await get('foods?fields=source,symptoms,barcode&limit=10').expect(200);
    for (const item of response.body.foods) {
      expect(item).toHaveProperty('food'); expect(item).toHaveProperty('pet'); expect(item).toHaveProperty('safety');
      expect(item).not.toHaveProperty('description');
      expect(Object.keys(item).every(key => ['food', 'pet', 'safety', 'source', 'symptoms', 'barcode'].includes(key))).toBe(true);
    }
  });
  test('search returns substring matches; exact and prefix modes are explicit', async () => {
    const contains = await get('search?q=choc&pet=dog').expect(200);
    expect(contains.body.results.length).toBeGreaterThan(0);
    expect(contains.body.results.every((item: { food: string }) => item.food.toLowerCase().includes('choc'))).toBe(true);
    const exact = await get('search?q=choc&match=exact').expect(200);
    expect(exact.body.count).toBe(0);
    const autocomplete = await get('autocomplete?q=choc').expect(200);
    expect(autocomplete.body.pagination.limit).toBe(20);
    expect(autocomplete.body.suggestions.every((item: { food: string }) => item.food.toLowerCase().startsWith('choc'))).toBe(true);
    await get('autocomplete?q=choc&limit=21').expect(400);
    await get('autocomplete?q=choc&match=exact').expect(400);
    await get('search').expect(400); await get('search?q=' + 'a'.repeat(101)).expect(400);
  });
  test('summaries, species coverage and source counts reconcile with the full dataset', async () => {
    const summary = await get('summary').expect(200);
    expect(summary.body.total).toBe(foodSafetyRepository.totalEntries);
    for (const field of ['byPet', 'bySafety', 'bySeverity', 'bySource']) expect(Object.values(summary.body[field]).reduce((sum: number, count) => sum + Number(count), 0)).toBe(summary.body.total);
    const filtered = await get('summary?pet=dog&safety=unsafe').expect(200);
    expect(filtered.body.byPet).toHaveProperty('dogs', filtered.body.total);
    await get('summary?limit=10').expect(400);
    const sources = await get('sources').expect(200);
    expect(sources.body.sources.reduce((sum: number, item: { count: number }) => sum + item.count, 0)).toBe(summary.body.total);
    const species = await get('species').expect(200);
    expect(species.body.species.length).toBe(10);
    const metadata = await get('metadata').expect(200);
    expect(metadata.body.limits).toMatchObject({ page: 100, batch: 20, compare: 10 });
    expect(metadata.body.fields).toContain('source');
    const source = sources.body.sources[0].source;
    const attributed = await get(`foods?source=${encodeURIComponent(source)}`).expect(200);
    expect(attributed.body.foods.every((item: { source: string }) => item.source.toLowerCase().includes(source.toLowerCase()))).toBe(true);
  });
  test('lookup remains curated-only and supports conditional data retrieval', async () => {
    const response = await get('lookup?pet=dog&food=chocolate').expect(200);
    expect(response.body).toMatchObject({ safety: 'unsafe', source: 'database' });
    await get('lookup?pet=dog&food=apple&mode=auto').expect(400);
  });
  test('validators require authentication and support weak, wildcard and list matching', async () => {
    const first = await get('pets').expect(200);
    const etag = first.headers.etag;
    expect(first.headers['cache-control']).toBe('private, max-age=0, must-revalidate');
    expect(first.headers.vary).toContain('Authorization');
    for (const value of [etag, `W/${etag}`, '*', `"other", ${etag}`]) {
      const response = await get('pets').set('If-None-Match', value).expect(304);
      expect(response.text).toBe('');
    }
    await get('pets').set('If-Match', etag).expect(200);
    const failed = await get('pets').set('If-Match', '"stale"').expect(412);
    expect(failed.headers['cache-control']).toBe('no-store');
    await get('pets').set('If-Match', `W/${etag}`).expect(412);
    await request(f.app).get('/api/v1/food-safety/pets').set('If-None-Match', etag).expect(401);
    const head = await request(f.app).head('/api/v1/food-safety/pets').set('Authorization', `Bearer ${f.rawKey}`).expect(200);
    expect(head.headers.etag).toBe(etag); expect(head.text).toBeUndefined();
  });
});
