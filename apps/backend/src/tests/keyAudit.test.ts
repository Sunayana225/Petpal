import { fixture } from './fixture';

test('audit events contain lifecycle actions without secrets', async () => {
  const f = await fixture();
  await f.agent.patch('/api/me/keys/'+f.key.id).send({name:'renamed'}).expect(200);
await f.agent.delete('/api/me/keys/'+f.key.id).expect(200);
const result=await f.agent.get('/api/me/audit').expect(200);
expect(result.body.events.map((e:{action:string})=>e.action)).toEqual(expect.arrayContaining(['key.created','key.updated','key.revoked']));
expect(JSON.stringify(result.body)).not.toContain(f.rawKey);
});
