import { fixture } from './fixture';
import { getDb } from '../db/database';
test('sensitive mutations require recent authentication', async () => {
  const f = await fixture();
  const row=getDb().prepare('SELECT sid,data FROM sessions WHERE user_id=?').get(f.userId) as {sid:string;data:string};
const data=JSON.parse(row.data);data.authenticatedAt=Date.now()-700000;getDb().prepare('UPDATE sessions SET data=? WHERE sid=?').run(JSON.stringify(data),row.sid);
const result=await f.agent.post('/api/me/keys').send({name:'stale'}).expect(403);expect(result.body.errorCode).toBe('REAUTH_REQUIRED');
});
