import { createDatabase, type Db } from '../db/database';
import { ApiKeyRepository } from '../repositories/apiKeyRepository';
import { UsageRepository } from '../repositories/usageRepository';
import { UserRepository } from '../repositories/userRepository';
import { ApiKeyService, generateApiKey, hashApiKey } from '../services/apiKeyService';

describe('ApiKeyService', () => {
  let db: Db;
  let keys: ApiKeyRepository;
  let usage: UsageRepository;
  let service: ApiKeyService;
  let userId: string;

  beforeEach(() => {
    db = createDatabase(':memory:');
    keys = new ApiKeyRepository(db);
    usage = new UsageRepository(db);
    service = new ApiKeyService(keys, usage);
    userId = new UserRepository(db).upsertFromOAuth({ provider: 'github', providerUserId: '1' }).id;
  });

  test('generateApiKey produces verifiable material', () => {
    const generated = generateApiKey();
    expect(generated.raw.startsWith('sk-')).toBe(true);
    expect(generated.hash).toBe(hashApiKey(generated.raw));
    expect(generated.raw.endsWith(generated.last4)).toBe(true);
    expect(generated.prefix).toBe(generated.raw.slice(0, 8));
  });

  test('create returns the raw key once and never stores it in plaintext', () => {
    const { key, rawKey } = service.create(userId, 'my key');

    expect(rawKey.startsWith('sk-')).toBe(true);
    expect(key).not.toHaveProperty('keyHash');
    expect(service.authenticate(rawKey)?.id).toBe(key.id);
  });

  test('rejects unknown, disabled and revoked keys', () => {
    const { key, rawKey } = service.create(userId, 'my key');

    expect(service.authenticate('sk-not-a-key')).toBeNull();

    service.update(userId, key.id, { enabled: false });
    expect(service.authenticate(rawKey)).toBeNull();

    service.update(userId, key.id, { enabled: true });
    service.revoke(userId, key.id);
    expect(service.authenticate(rawKey)).toBeNull();
  });

  test('quota counts usage within the window', () => {
    const { key } = service.create(userId, 'limited', { quotaLimit: 2, quotaWindow: 'day' });
    expect(service.quotaStatus(key).remaining).toBe(2);

    usage.record({ keyId: key.id, method: 'GET', path: '/x', status: 200, latencyMs: 1 });
    expect(service.quotaStatus(key)).toMatchObject({ used: 1, remaining: 1, limit: 2 });

    usage.record({ keyId: key.id, method: 'GET', path: '/x', status: 200, latencyMs: 1 });
    expect(service.isWithinQuota(key)).toBe(false);
  });

  test('an unlimited key is always within quota', () => {
    const { key } = service.create(userId, 'unlimited', { quotaLimit: null });
    usage.record({ keyId: key.id, method: 'GET', path: '/x', status: 200, latencyMs: 1 });

    expect(service.isWithinQuota(key)).toBe(true);
    expect(service.quotaStatus(key).remaining).toBeNull();
  });

  test('a key is only visible to its owner', () => {
    const { key } = service.create(userId, 'mine');
    const otherId = new UserRepository(db)
      .upsertFromOAuth({ provider: 'google', providerUserId: '2' }).id;

    expect(service.update(otherId, key.id, { name: 'hijack' })).toBeNull();
    expect(service.revoke(otherId, key.id)).toBeNull();
  });
});
