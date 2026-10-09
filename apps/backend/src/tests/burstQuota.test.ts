import { fixture } from './fixture';
import request from 'supertest';

test('per-key burst limits return Retry-After', async () => {
  const f = await fixture();
  const old=process.env.KEY_BURST_LIMIT;process.env.KEY_BURST_LIMIT='1';try{await request(f.app).get('/api/v1/food-safety/stats').set('Authorization','Bearer '+f.rawKey).expect(200);const r=await request(f.app).get('/api/v1/food-safety/stats').set('Authorization','Bearer '+f.rawKey).expect(429);expect(r.headers['retry-after']).toBe('60');}finally{if(old===undefined)delete process.env.KEY_BURST_LIMIT;else process.env.KEY_BURST_LIMIT=old;}
});
