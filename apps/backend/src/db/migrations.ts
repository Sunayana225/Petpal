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
  // Append new migrations below the initial schema.
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
  {
    id: 2,
    name: 'identity-session-key-security',
    sql: `
      ALTER TABLE users ADD COLUMN disabled INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE api_keys ADD COLUMN expires_at TEXT;
      CREATE TABLE identities (
        provider TEXT NOT NULL, provider_user_id TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY(provider, provider_user_id)
      );
      INSERT INTO identities SELECT provider, provider_user_id, id FROM users;
      CREATE INDEX idx_identities_user ON identities(user_id);
      CREATE INDEX idx_sessions_user ON sessions(user_id);
      CREATE TABLE oauth_transactions (
        state TEXT PRIMARY KEY, sid TEXT NOT NULL, provider TEXT NOT NULL,
        return_to TEXT, link_user_id TEXT, expires_at INTEGER NOT NULL
      );
      CREATE INDEX idx_oauth_expiry ON oauth_transactions(expires_at);
      CREATE TABLE audit_events (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
        action TEXT NOT NULL, resource_id TEXT, ts TEXT NOT NULL
      );
      CREATE INDEX idx_audit_user_ts ON audit_events(user_id, ts);
      UPDATE users SET role = 'user' WHERE provider = 'dev';
    `,
  },
  {
    id: 3,
    name: 'session-revocation-tombstones',
    sql: `CREATE TABLE session_revocations (sid TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
          CREATE INDEX idx_revocations_expiry ON session_revocations(expires_at);`,
  },
  {
    id: 4,
    name: 'review-cache-revision',
    sql: `CREATE TABLE review_revision (id INTEGER PRIMARY KEY CHECK(id = 1), revision INTEGER NOT NULL);
          INSERT INTO review_revision VALUES (1, 0);
          CREATE TRIGGER review_decision_revision AFTER UPDATE OF status ON ai_answers
            WHEN OLD.status <> NEW.status
            BEGIN UPDATE review_revision SET revision = revision + 1 WHERE id = 1; END;
          CREATE TRIGGER review_delete_revision AFTER DELETE ON ai_answers
            BEGIN UPDATE review_revision SET revision = revision + 1 WHERE id = 1; END;
          UPDATE ai_answers SET expires_at = NULL WHERE status = 'rejected';
          CREATE INDEX idx_answers_queue ON ai_answers(status, created_at DESC, id DESC);`,
  },
];
