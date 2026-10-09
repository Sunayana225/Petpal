import { fixture } from './fixture';

test('rotation works when the active-key limit is reached', async () => {
  const f = await fixture();
  const old=process.env.MAX_ACTIVE_KEYS;process.env.MAX_ACTIVE_KEYS='1';try{await f.agent.post('/api/me/keys/'+f.key.id+'/rotate').send({}).expect(201);}finally{if(old===undefined)delete process.env.MAX_ACTIVE_KEYS;else process.env.MAX_ACTIVE_KEYS=old;}
});
