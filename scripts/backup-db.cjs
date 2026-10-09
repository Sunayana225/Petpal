const Database = require('better-sqlite3');
const { existsSync, mkdirSync } = require('node:fs');
const { dirname, resolve } = require('node:path');
const databasePath = process.env.DB_PATH;
const destination = process.argv[2];
if (!databasePath || databasePath === ':memory:' || !existsSync(databasePath) || !destination) {
  console.error('Set DB_PATH to an existing database and provide a new backup destination.');
  process.exit(1);
}
const source = resolve(databasePath), target = resolve(destination);
if (source === target || existsSync(target)) {
  console.error('Backup destination must be new and different from the source.');
  process.exit(1);
}
(async () => {
  mkdirSync(dirname(target), { recursive: true });
  const db = new Database(source, { readonly: true, fileMustExist: true });
  try {
    await db.backup(target);
    const backup = new Database(target, { readonly: true, fileMustExist: true });
    try { if (backup.pragma('integrity_check', { simple: true }) !== 'ok') throw new Error('Backup integrity check failed'); }
    finally { backup.close(); }
    console.log('Online database backup completed and integrity checked.');
  } finally { db.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
