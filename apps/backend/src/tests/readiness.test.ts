import { fixture } from './fixture';
import request from 'supertest';

test('database readiness is separate from liveness', async () => {
  const f = await fixture();
  const result=await request(f.app).get('/api/ready').expect(200);expect(result.body.status).toBe('ready');
});
