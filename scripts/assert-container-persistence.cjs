// CI-only fixture, streamed to `docker exec node`; never copied into the release image.
const assert = require('node:assert/strict');
if (process.env.CI_PERSISTENCE_TEST !== '1') throw new Error('This fixture is restricted to an isolated CI container.');
const { getDb, closeDb } = require('./apps/backend/dist/db/database');
const { UserRepository } = require('./apps/backend/dist/repositories/userRepository');
const { apiKeyService } = require('./apps/backend/dist/services/apiKeyService');
const { AiAnswerRepository } = require('./apps/backend/dist/repositories/aiAnswerRepository');
const { SqliteSessionStore } = require('./apps/backend/dist/auth/sessionStore');
(async () => {
  const db = getDb();
  if (process.env.CI_PERSISTENCE_SEED === '1') {
    const user = new UserRepository(db).upsertFromOAuth({ provider: 'ci-fixture', providerUserId: 'volume-check' });
    apiKeyService().create(user.id, 'ci-volume-key', { quotaLimit: 1 });
    new AiAnswerRepository(db).save({ pet: 'dogs', food: 'ci-volume-review', safety: 'unknown', source: 'none', status: 'cached', ttlMs: null, payload: { pet: 'dogs', food: 'ci-volume-review', safety: 'unknown', message: 'fixture' } });
    await new Promise((resolve, reject) => new SqliteSessionStore(db).set('ci-volume-session', { cookie: { originalMaxAge: 3600000, expires: new Date(Date.now() + 3600000) }, passport: { user: user.id } }, error => error ? reject(error) : resolve()));
  }
  assert.ok(db.prepare("SELECT id FROM users WHERE provider = 'ci-fixture' AND provider_user_id = 'volume-check'").get());
  assert.ok(db.prepare("SELECT id FROM api_keys WHERE name = 'ci-volume-key'").get());
  assert.ok(db.prepare("SELECT sid FROM sessions WHERE sid = 'ci-volume-session'").get());
  assert.ok(db.prepare("SELECT id FROM ai_answers WHERE food = 'ci-volume-review'").get());
  assert.equal(db.pragma('integrity_check', { simple: true }), 'ok');
  closeDb();
  console.log('Account, API key, session and review records persist with database integrity intact.');
})().catch(error => { console.error(error.message); closeDb(); process.exitCode = 1; });
