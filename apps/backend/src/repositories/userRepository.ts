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
}

export interface OAuthProfile {
  provider: string;
  providerUserId: string;
  email?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
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
      .prepare('SELECT * FROM users WHERE provider = ? AND provider_user_id = ?')
      .get(provider, providerUserId) as UserRow | undefined;
    return row ? toUser(row) : null;
  }

  /** Insert a user on first login, or refresh their profile on subsequent ones. */
  upsertFromOAuth(profile: OAuthProfile): User {
    const now = new Date().toISOString();
    const email = profile.email ?? null;
    const role: Role = email && adminEmails().includes(email.toLowerCase()) ? 'admin' : 'user';

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
           role          = CASE WHEN users.role = 'admin' THEN 'admin' ELSE excluded.role END`,
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

    return this.findByProvider(profile.provider, profile.providerUserId)!;
  }
}

let singleton: UserRepository | null = null;

/** Lazily-built shared repository — importing this module opens no database. */
export function userRepository(): UserRepository {
  if (!singleton) singleton = new UserRepository(getDb());
  return singleton;
}
