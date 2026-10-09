import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', workers: 1, timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:42179', trace: 'retain-on-failure', ignoreHTTPSErrors: true },
  webServer: [
    { command: 'node node_modules/ts-node/dist/bin.js apps/backend/src/index.ts', url: 'http://127.0.0.1:42180/api/health', timeout: 60000,
      env: { NODE_ENV: 'test', DB_PATH: ':memory:', PORT: '42180', RATE_LIMIT_MAX_REQUESTS: '10000', LOGIN_LIMIT: '1000', DEV_AUTH: '1', CORS_ORIGIN: 'http://127.0.0.1:42179' } },
    { command: 'npm run dev --workspace @petpal/web -- --port 42179 --host 127.0.0.1 --strictPort', url: 'http://127.0.0.1:42179', timeout: 60000,
      env: { PETPAL_API_PROXY_TARGET: 'http://127.0.0.1:42180' } },
    { command: 'node scripts/test-tls-server.cjs', url: 'https://127.0.0.1:42443/api/health', ignoreHTTPSErrors: true, timeout: 60000 },
  ],
});
