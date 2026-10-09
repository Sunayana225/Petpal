import request from 'supertest';
import { createApp } from '../app';
import { metrics } from '../routes/monitoring';
test('unknown URLs do not create new metrics labels', async () => {
  const app = createApp(); const before = Object.keys(metrics.requests.byEndpoint).length;
  for (let i = 0; i < 20; i++) await request(app).get('/api/unknown-'+i).expect(404);
  expect(Object.keys(metrics.requests.byEndpoint).length - before).toBeLessThanOrEqual(1);
});
