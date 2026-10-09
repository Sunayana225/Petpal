import request from 'supertest';
import { createApp } from '../app';
test('previous signing secrets continue to validate existing sessions', async () => {
  const before = { ...process.env };
  try {
    process.env.SESSION_SECRET = 'previous-signing-secret'; delete process.env.SESSION_PREVIOUS_SECRETS;
    const login = await request(createApp()).post('/api/auth/dev-login').send({}).expect(200);
    const cookie = String(login.headers['set-cookie']).split(';')[0];
    process.env.SESSION_SECRET = 'current-signing-secret'; process.env.SESSION_PREVIOUS_SECRETS = 'previous-signing-secret';
    const response = await request(createApp()).get('/api/auth/me').set('Cookie', cookie).expect(200);
    expect(response.body.user).not.toBeNull();
  } finally { process.env = before; }
});
