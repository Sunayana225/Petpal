import { fixture } from './fixture';
import request from 'supertest';

test('operational metrics require admin authorization', async () => {
  const f = await fixture();
  await request(f.app).get('/api/monitoring/metrics').expect(401);await f.agent.get('/api/monitoring/status').expect(401);
});
