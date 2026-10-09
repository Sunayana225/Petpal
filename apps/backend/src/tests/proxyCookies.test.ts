import request from 'supertest';
import { createApp } from '../app';
test('Secure cookies are issued behind a trusted HTTPS proxy only', async () => {
  const before = { ...process.env };
  try {
    process.env.TRUST_PROXY = '1'; process.env.SESSION_COOKIE_SAMESITE = 'none';
    const app = createApp();
    const tls = await request(app).post('/api/auth/dev-login').set('X-Forwarded-Proto', 'https').send({}).expect(200);
    expect(String(tls.headers['set-cookie'])).toContain('Secure');
    expect(String(tls.headers['set-cookie'])).toContain('HttpOnly');
    expect(String(tls.headers['set-cookie'])).toContain('SameSite=None');
    const plain = await request(app).post('/api/auth/dev-login').send({}).expect(200);
    expect(plain.headers['set-cookie']).toBeUndefined();
  } finally { process.env = before; }
});
