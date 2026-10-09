import { fixture } from './fixture';
import request from 'supertest';

test('account policy applies even to unlimited keys', async () => {
  const f = await fixture();
  const previous=process.env.ACCOUNT_DAILY_QUOTA;process.env.ACCOUNT_DAILY_QUOTA='1';try{await request(f.app).get('/api/v1/food-safety/stats').set('Authorization','Bearer '+f.rawKey).expect(200);await request(f.app).get('/api/v1/food-safety/stats').set('Authorization','Bearer '+f.rawKey).expect(429);}finally{if(previous===undefined)delete process.env.ACCOUNT_DAILY_QUOTA;else process.env.ACCOUNT_DAILY_QUOTA=previous;}
});
