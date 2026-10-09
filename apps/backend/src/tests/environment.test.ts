import { env, validateEnvironment } from '../config/env';

test.each(['2.5', '-1', '100junk', 'Infinity'])('numeric settings reject %s', (value) => {
  const old = process.env.PORT; process.env.PORT = value;
  try { expect(() => env.port).toThrow(); }
  finally { if (old === undefined) delete process.env.PORT; else process.env.PORT = old; }
});
test('production requires strong secrets and HTTPS callback configuration', () => {
  const before = { ...process.env };
  try {
    Object.assign(process.env, { NODE_ENV: 'production', SESSION_SECRET: 'short' });
    expect(() => validateEnvironment()).toThrow(/32/);
    process.env.SESSION_SECRET = 'x'.repeat(32);
    process.env.WEB_APP_URL = 'http://localhost:3000';
    expect(() => validateEnvironment()).toThrow(/HTTPS/);
  } finally { process.env = before; }
});
test('secret rotation signs with the newest secret while retaining previous ones', () => {
  const old = process.env.SESSION_PREVIOUS_SECRETS; process.env.SESSION_PREVIOUS_SECRETS = 'old-secret';
  try { expect(env.sessionSecrets[1]).toBe('old-secret'); }
  finally { if (old === undefined) delete process.env.SESSION_PREVIOUS_SECRETS; else process.env.SESSION_PREVIOUS_SECRETS = old; }
});
