import { randomUUID } from 'crypto';

import { env } from '../config/env';
import { getDb, type Db } from '../db/database';

export type Role = 'user' | 'admin';

export interface User {
  id: string;
  provider: string;
  providerUserId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  role: Role;
  createdAt: string;
  lastLoginAt: string | null;
  disabled: boolean;
}

export interface OAuthProfile {
  provider: string;
  providerUserId: string;
  email?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  emailVerified?: boolean;
}

interface UserRow {
  id: string;
  provider: string;
  provider_user_id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  role: Role;
  created_at: string;
  last_login_at: string | null;
  disabled: number;
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    provider: row.provider,
    providerUserId: row.provider_user_id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    role: row.role,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
    disabled: row.disabled === 1,
  };
}

/** Emails listed here are promoted to `admin` on login — bootstrapping aid. */
function adminEmails(): string[] {
  return env.adminEmails;
}

export class UserRepository {
  constructor(private readonly db: Db) {}

  findById(id: string): User | null {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
    return row ? toUser(row) : null;
  }

  findByProvider(provider: string, providerUserId: string): User | null {
    const row = this.db
      .prepare('SELECT u.* FROM users u JOIN identities i ON i.user_id = u.id WHERE i.provider = ? AND i.provider_user_id = ?')
      .get(provider, providerUserId) as UserRow | undefined;
    return row ? toUser(row) : null;
  }

  /** Insert a user on first login, or refresh their profile on subsequent ones. */
  upsertFromOAuth(profile: OAuthProfile): User {
    const now = new Date().toISOString();
    const email = profile.email?.trim().toLowerCase() ?? null;
    const role: Role = profile.provider !== 'dev' && profile.emailVerified === true && email && adminEmails().includes(email) ? 'admin' : 'user';
    const linked = this.findByProvider(profile.provider, profile.providerUserId);
    if (linked) {
      this.db.prepare(`UPDATE users SET last_login_at = ?, email = COALESCE(?, email), name = COALESCE(?, name), avatar_url = COALESCE(?, avatar_url),
        role = CASE WHEN provider = 'dev' THEN 'user' WHEN role = 'admin' THEN 'admin' ELSE ? END WHERE id = ?`)
        .run(now, email, profile.name ?? null, profile.avatarUrl ?? null, role, linked.id);
      return this.findById(linked.id)!;
    }

    this.db
      .prepare(
        `INSERT INTO users
           (id, provider, provider_user_id, email, name, avatar_url, role, created_at, last_login_at)
         VALUES
           (@id, @provider, @providerUserId, @email, @name, @avatarUrl, @role, @now, @now)
         ON CONFLICT(provider, provider_user_id) DO UPDATE SET
           email         = excluded.email,
           name          = excluded.name,
           avatar_url    = excluded.avatar_url,
           last_login_at = excluded.last_login_at,
           role          = CASE WHEN users.provider = 'dev' THEN 'user' WHEN users.role = 'admin' THEN 'admin' ELSE excluded.role END`,
      )
      .run({
        id: randomUUID(),
        provider: profile.provider,
        providerUserId: profile.providerUserId,
        email,
        name: profile.name ?? null,
        avatarUrl: profile.avatarUrl ?? null,
        role,
        now,
      });

    const row = this.db.prepare('SELECT id FROM users WHERE provider = ? AND provider_user_id = ?').get(profile.provider, profile.providerUserId) as { id: string };
    this.db.prepare('INSERT OR IGNORE INTO identities VALUES (?, ?, ?)').run(profile.provider, profile.providerUserId, row.id);
    return this.findById(row.id)!;
  }

  identities(userId: string): { provider: string; providerUserId: string }[] {
    return this.db.prepare('SELECT provider, provider_user_id AS providerUserId FROM identities WHERE user_id = ? ORDER BY provider').all(userId) as { provider: string; providerUserId: string }[];
  }

  link(userId: string, profile: OAuthProfile): User {
    return this.db.transaction(() => {
      const owner = this.findByProvider(profile.provider, profile.providerUserId);
      if (owner && owner.id !== userId) throw new Error('Identity already belongs to another account');
      this.db.prepare('INSERT OR IGNORE INTO identities VALUES (?, ?, ?)').run(profile.provider, profile.providerUserId, userId);
      return this.findById(userId)!;
    }).immediate();
  }

  unlink(userId: string, provider: string): boolean {
    return this.db.transaction(() => {
      const remaining = this.identities(userId).filter((identity) => identity.provider !== provider);
      if (!remaining.length) return false;
      const changed = this.db.prepare('DELETE FROM identities WHERE user_id = ? AND provider = ?').run(userId, provider).changes > 0;
      if (changed && this.findById(userId)?.provider === provider) {
        // Release the original provider tuple so an unlinked identity cannot
        // regain the account through users' legacy uniqueness constraint.
        this.db.prepare('UPDATE users SET provider = ?, provider_user_id = ? WHERE id = ?').run(remaining[0].provider, remaining[0].providerUserId, userId);
      }
      return changed;
    }).immediate();
  }
}

let singleton: UserRepository | null = null;

/** Lazily-built shared repository — importing this module opens no database. */
export function userRepository(): UserRepository {
  if (!singleton) singleton = new UserRepository(getDb());
  return singleton;
}
