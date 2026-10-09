import { fixture } from './fixture';
import request from 'supertest';

test('bearer clients remain exempt from cookie CSRF tokens', async () => {
  const f = await fixture();
  await request(f.app).post('/api/v1/food-safety/check').set('Authorization','Bearer '+f.rawKey).send({pet:'dog',food:'apple'}).expect(200);
});
