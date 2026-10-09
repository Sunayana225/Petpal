import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

import { env } from '../config/env';
import { dataFilePath } from '../utils/dataFiles';
import { MIGRATIONS } from './migrations';

export type Db = Database.Database;

const DEFAULT_FILE = 'petpal.db';

/**
 * Open (or create) the PetPal database and bring the schema up to date.
 *
 * `path` is injectable so tests can use `':memory:'` — a fresh, isolated
 * database per suite with no files left behind.
 */
export function createDatabase(path: string = env.dbPath ?? dataFilePath(DEFAULT_FILE)): Db {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);

  // WAL keeps readers from blocking the writer; meaningless for :memory:.
  if (path !== ':memory:') db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  migrate(db);
  return db;
}

function migrate(db: Db): void {
  db.exec(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       id         INTEGER PRIMARY KEY,
       name       TEXT NOT NULL,
       applied_at TEXT NOT NULL
     )`,
  );

  const applied = new Set(
    (db.prepare('SELECT id FROM schema_migrations').all() as { id: number }[]).map((row) => row.id),
  );

  const apply = db.transaction((migration: (typeof MIGRATIONS)[number]) => {
    db.exec(migration.sql);
    db.prepare('INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)').run(
      migration.id,
      migration.name,
      new Date().toISOString(),
    );
  });

  for (const migration of MIGRATIONS) {
    if (!applied.has(migration.id)) apply(migration);
  }
}

let singleton: Db | null = null;

/** Process-wide database. Created lazily so importing this never opens a file. */
export function getDb(): Db {
  if (!singleton) singleton = createDatabase();
  return singleton;
}
export function closeDb(): void {
  if (singleton?.open) singleton.close();
  singleton = null;
}
