import { fixture } from './fixture';
import request from 'supertest';

test('all route errors carry the response correlation id', async () => {
  const f = await fixture();
  const result=await request(f.app).get('/api/v1/food-safety/stats').set('x-request-id','route-error').expect(401);
expect(result.body).toMatchObject({code:401,errorCode:'HTTP_401',requestId:'route-error'});expect(result.headers['x-request-id']).toBe(result.body.requestId);
});
