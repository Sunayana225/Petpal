import { createDatabase } from '../db/database';
import { UserRepository } from '../repositories/userRepository';

test('only verified provider emails may bootstrap admins; dev emails never do', () => {
  const db = createDatabase(':memory:'); const users = new UserRepository(db);
  const previous = process.env.ADMIN_EMAILS; process.env.ADMIN_EMAILS = 'boss@example.com';
  try {
    expect(users.upsertFromOAuth({ provider: 'google', providerUserId: 'unverified', email: 'BOSS@example.com' }).role).toBe('user');
    expect(users.upsertFromOAuth({ provider: 'google', providerUserId: 'verified', email: ' BOSS@example.com ', emailVerified: true }).role).toBe('admin');
    expect(users.upsertFromOAuth({ provider: 'dev', providerUserId: 'dev', email: 'boss@example.com', emailVerified: true }).role).toBe('user');
  } finally { if (previous === undefined) delete process.env.ADMIN_EMAILS; else process.env.ADMIN_EMAILS = previous; db.close(); }
});

test('linking cannot steal identities; unlink releases the primary identity', () => {
  const db = createDatabase(':memory:'); const users = new UserRepository(db);
  const first = users.upsertFromOAuth({ provider: 'github', providerUserId: 'first' });
  const second = users.upsertFromOAuth({ provider: 'google', providerUserId: 'second' });
  expect(() => users.link(first.id, { provider: 'google', providerUserId: 'second' })).toThrow();
  users.link(first.id, { provider: 'google', providerUserId: 'linked' });
  expect(users.upsertFromOAuth({ provider: 'google', providerUserId: 'linked' }).id).toBe(first.id);
  expect(users.unlink(first.id, 'github')).toBe(true);
  expect(users.upsertFromOAuth({ provider: 'github', providerUserId: 'first' }).id).not.toBe(first.id);
  expect(users.findByProvider('google', 'second')?.id).toBe(second.id);
  expect(users.unlink(first.id, 'google')).toBe(false);
  db.close();
});
