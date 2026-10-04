/**
 * Ordered, append-only schema migrations.
 *
 * Each migration runs once, inside a transaction, and is recorded in
 * `schema_migrations`. Never edit a shipped migration — add a new one.
 */

export interface Migration {
  id: number;
  name: string;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  {
    id: 1,
    name: 'initial-schema',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id               TEXT PRIMARY KEY,
        provider         TEXT NOT NULL,
        provider_user_id TEXT NOT NULL,
        email            TEXT,
        name             TEXT,
        avatar_url       TEXT,
        role             TEXT NOT NULL DEFAULT 'user',
        created_at       TEXT NOT NULL,
        last_login_at    TEXT,
        UNIQUE (provider, provider_user_id)
      );

      CREATE TABLE IF NOT EXISTS sessions (
        sid        TEXT PRIMARY KEY,
        user_id    TEXT,
        data       TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);

      CREATE TABLE IF NOT EXISTS api_keys (
        id            TEXT PRIMARY KEY,
        user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name          TEXT NOT NULL,
        prefix        TEXT NOT NULL,
        key_hash      TEXT NOT NULL UNIQUE,
        last4         TEXT NOT NULL,
        enabled       INTEGER NOT NULL DEFAULT 1,
        scope         TEXT NOT NULL DEFAULT 'food-safety',
        quota_limit   INTEGER,
        quota_window  TEXT NOT NULL DEFAULT 'day',
        ip_allowlist  TEXT,
        created_at    TEXT NOT NULL,
        last_used_at  TEXT,
        revoked_at    TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys (user_id);

      CREATE TABLE IF NOT EXISTS usage_events (
        id         TEXT PRIMARY KEY,
        key_id     TEXT NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
        ts         TEXT NOT NULL,
        method     TEXT NOT NULL,
        path       TEXT NOT NULL,
        status     INTEGER NOT NULL,
        latency_ms INTEGER NOT NULL,
        source     TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_usage_key_ts ON usage_events (key_id, ts);

      CREATE TABLE IF NOT EXISTS ai_answers (
        id         TEXT PRIMARY KEY,
        pet        TEXT NOT NULL,
        food       TEXT NOT NULL,
        safety     TEXT NOT NULL,
        payload    TEXT NOT NULL,
        source     TEXT NOT NULL,
        status     TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL,
        expires_at INTEGER,
        UNIQUE (pet, food)
      );
      CREATE INDEX IF NOT EXISTS idx_ai_answers_status ON ai_answers (status);
    `,
  },
];
