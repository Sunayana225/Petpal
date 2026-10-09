import { fixture } from './fixture';
import request from 'supertest';

test('disabled accounts lose session and API access', async () => {
  const f = await fixture();
  process.env.ADMIN_TOKEN='disable-test'; try {
await request(f.app).patch('/api/admin/users/'+f.userId).set('x-admin-token','disable-test').send({disabled:true}).expect(200);
expect((await f.agent.get('/api/auth/me')).body.user).toBeNull();
await request(f.app).get('/api/v1/food-safety/stats').set('Authorization','Bearer '+f.rawKey).expect(401);
}finally{delete process.env.ADMIN_TOKEN;}
});
