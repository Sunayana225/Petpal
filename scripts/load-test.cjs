const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { Worker, isMainThread, parentPort, workerData } = require('node:worker_threads');
const assert = require('node:assert/strict');
if (!isMainThread) {
  const { createDatabase } = require('../apps/backend/dist/db/database');
  const { UsageRepository } = require('../apps/backend/dist/repositories/usageRepository');
  const db = createDatabase(workerData.path);
  const usage = new UsageRepository(db); let admitted = 0;
  for (let n = 0; n < 25; n++) if (usage.reserve(workerData.key, new Date(0).toISOString(), new Date(0).toISOString(), 10000, 10000, 'GET', '/load')) admitted++;
  db.close(); parentPort.postMessage(admitted);
} else {
  (async () => {
    const directory = mkdtempSync(join(tmpdir(), 'petpal-load-'));
    Object.assign(process.env, { NODE_ENV: 'test', DB_PATH: join(directory, 'load.db'), RATE_LIMIT_MAX_REQUESTS: '10000', LOGIN_LIMIT: '1000' });
    const { getDb, closeDb } = require('../apps/backend/dist/db/database');
    const { userRepository } = require('../apps/backend/dist/repositories/userRepository');
    const { apiKeyService } = require('../apps/backend/dist/services/apiKeyService');
    const { createApp } = require('../apps/backend/dist/app');
    const user = userRepository().upsertFromOAuth({ provider: 'test', providerUserId: 'load' });
    const key = apiKeyService().create(user.id, 'load-quota', { quotaLimit: 10 }).key;
    const workers = Array.from({ length: 8 }, () => new Promise((resolve, reject) => {
      const worker = new Worker(__filename, { workerData: { path: process.env.DB_PATH, key } });
      worker.once('message', resolve); worker.once('error', reject);
      worker.once('exit', (code) => { if (code) reject(new Error(`Worker exited ${code}`)); });
    }));
    let server;
    try {
      const admitted = (await Promise.all(workers)).reduce((a, b) => a + b, 0);
      assert.equal(admitted, 10, 'SQLite writers must atomically admit exactly the quota');
      server = createApp().listen(0, '127.0.0.1');
      await new Promise((resolve) => server.once('listening', resolve));
      const base = `http://127.0.0.1:${server.address().port}/api`;
      const login = await fetch(`${base}/auth/dev-login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const cookie = login.headers.get('set-cookie').split(';')[0];
      const responses = await Promise.all(Array.from({ length: 100 }, () => fetch(`${base}/auth/me`, { headers: { Cookie: cookie } })));
      for (const response of responses) assert.equal((await response.json()).user.provider, 'dev');
      assert.ok(getDb().prepare('SELECT COUNT(*) AS n FROM sessions').get().n > 0);
      console.log('Load checks passed: 200 competing quota reservations across 8 SQLite writers; 100 authenticated session reads.');
    } finally {
      if (server) await new Promise((resolve) => server.close(resolve));
      closeDb(); rmSync(directory, { recursive: true, force: true });
    }
  })().catch((error) => { console.error(error); process.exitCode = 1; });
}
