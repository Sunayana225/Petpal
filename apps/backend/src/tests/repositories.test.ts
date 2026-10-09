import { createDatabase, type Db } from '../db/database';
import { ApiKeyRepository } from '../repositories/apiKeyRepository';
import { UsageRepository } from '../repositories/usageRepository';
import { UserRepository } from '../repositories/userRepository';

const EPOCH = new Date(0).toISOString();

describe('repositories', () => {
  let db: Db;

  beforeEach(() => {
    // A fresh in-memory database per test — migrations run on creation.
    db = createDatabase(':memory:');
  });

  describe('UserRepository', () => {
    test('inserts on first login and refreshes on the next', () => {
      const users = new UserRepository(db);

      const first = users.upsertFromOAuth({
        provider: 'github',
        providerUserId: '42',
        email: 'a@example.com',
        name: 'Ada',
      });
      expect(first.role).toBe('user');
      expect(users.findByProvider('github', '42')?.id).toBe(first.id);

      const again = users.upsertFromOAuth({
        provider: 'github',
        providerUserId: '42',
        email: 'a@example.com',
        name: 'Ada L.',
      });
      expect(again.id).toBe(first.id);
      expect(again.name).toBe('Ada L.');
      expect(users.findById(first.id)?.name).toBe('Ada L.');
    });

    test('promotes an email listed in ADMIN_EMAILS', () => {
      process.env.ADMIN_EMAILS = 'boss@example.com';
      try {
        const users = new UserRepository(db);
        const user = users.upsertFromOAuth({
          provider: 'google',
          providerUserId: '7',
          email: 'boss@example.com',
          emailVerified: true,
        });
        expect(user.role).toBe('admin');
      } finally {
        delete process.env.ADMIN_EMAILS;
      }
    });
  });

  describe('ApiKeyRepository', () => {
    function seedUser(): string {
      return new UserRepository(db).upsertFromOAuth({ provider: 'github', providerUserId: '1' }).id;
    }

    function createKey(keys: ApiKeyRepository, userId: string, hash = 'hash-1') {
      return keys.create({
        userId,
        name: 'CI key',
        keyHash: hash,
        prefix: 'sk-abcdef',
        last4: 'beef',
        scope: 'food-safety',
        quotaLimit: 1000,
        quotaWindow: 'day',
        ipAllowlist: [],
      });
    }

    test('creates, lists and finds by hash', () => {
      const userId = seedUser();
      const keys = new ApiKeyRepository(db);
      const created = createKey(keys, userId);

      expect(created.enabled).toBe(true);
      expect(created.quotaLimit).toBe(1000);
      expect(keys.listByUser(userId)).toHaveLength(1);
      expect(keys.findByHash('hash-1')?.id).toBe(created.id);
    });

    test('updates mutable fields', () => {
      const userId = seedUser();
      const keys = new ApiKeyRepository(db);
      const created = createKey(keys, userId);

      const updated = keys.update(userId, created.id, { enabled: false, quotaLimit: null });
      expect(updated?.enabled).toBe(false);
      expect(updated?.quotaLimit).toBeNull();
    });

    test('revoke removes it from the active list but keeps the record', () => {
      const userId = seedUser();
      const keys = new ApiKeyRepository(db);
      const created = createKey(keys, userId);

      const revoked = keys.revoke(userId, created.id);
      expect(revoked?.revokedAt).toBeTruthy();
      expect(keys.listByUser(userId)).toHaveLength(0);
      expect(keys.findByHash('hash-1')?.revokedAt).toBeTruthy();
    });

    test('a key cannot be fetched by a different user', () => {
      const userId = seedUser();
      const otherId = new UserRepository(db)
        .upsertFromOAuth({ provider: 'google', providerUserId: '9' }).id;
      const keys = new ApiKeyRepository(db);
      const created = createKey(keys, userId);

      expect(keys.findById(otherId, created.id)).toBeNull();
    });
  });

  describe('UsageRepository', () => {
    test('records events, counts within a window, and aggregates by day', () => {
      const user = new UserRepository(db).upsertFromOAuth({
        provider: 'github',
        providerUserId: '1',
      });
      const key = new ApiKeyRepository(db).create({
        userId: user.id,
        name: 'k',
        keyHash: 'h',
        prefix: 'sk-x',
        last4: '0000',
        scope: 'food-safety',
        quotaLimit: null,
        quotaWindow: 'day',
        ipAllowlist: [],
      });
      const usage = new UsageRepository(db);

      usage.record({ keyId: key.id, method: 'GET', path: '/check', status: 200, latencyMs: 5, source: 'ai' });
      usage.record({ keyId: key.id, method: 'GET', path: '/check', status: 200, latencyMs: 9 });

      expect(usage.countSince(key.id, EPOCH)).toBe(2);
      expect(usage.recentForKey(key.id, 10)).toHaveLength(2);
      expect(usage.totalsForUser(user.id, EPOCH).total).toBe(2);
      expect(usage.dailyForUser(user.id, EPOCH)[0]?.count).toBe(2);
      expect(usage.recentForUser(user.id, 10)[0]?.latencyMs).toBe(9);
    });
  });
});
