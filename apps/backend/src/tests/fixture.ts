import request from 'supertest';
import { randomUUID } from 'crypto';
import { createApp } from '../app';

export async function fixture() {
  const app = createApp();
  const agent = request.agent(app);
  const login = await agent.post('/api/auth/dev-login').send({ email: `${randomUUID()}@example.com` }).expect(200);
  agent.set('x-csrf-token', login.body.csrfToken);
  const created = await agent.post('/api/me/keys').send({ name: 'fixture' }).expect(201);
  return { app, agent, key: created.body.key as { id: string; userId: string; expiresAt: string | null }, rawKey: created.body.rawKey as string,
    csrf: login.body.csrfToken as string, userId: login.body.user.id as string,
    cookie: String(login.headers['set-cookie']).split(';')[0] };
}
