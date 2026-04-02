import Database, { Database as DatabaseType } from 'better-sqlite3';
import bcrypt from 'bcrypt';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'data.db');

const db: DatabaseType = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      must_change_password INTEGER NOT NULL DEFAULT 0,
      role TEXT NOT NULL DEFAULT 'admin',
      language TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL,
      language TEXT,
      used_by TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      used_at TEXT
    );

  `);

  // Migrate: ensure invites table exists (for older DBs)
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS invites (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE NOT NULL, role TEXT NOT NULL, language TEXT, used_by TEXT, created_by TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), used_at TEXT)`);
  } catch {}

  // Seed default admin if none exist
  const count = db.prepare('SELECT COUNT(*) as c FROM admin_users').get() as any;
  if (count.c === 0) {
    const hash = bcrypt.hashSync('admin', 10);
    db.prepare(
      'INSERT INTO admin_users (username, password_hash, must_change_password, role, created_by) VALUES (?, ?, 1, ?, ?)'
    ).run('admin', hash, 'admin', 'system');
    console.log('Default admin seeded (admin/admin)');
  }

  // Seed default settings
  const upsertSetting = db.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
  );
  upsertSetting.run('page_title', 'Toone');
  upsertSetting.run('talk_name', '');
}

export default db;
