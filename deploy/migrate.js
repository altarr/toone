const Database = require('better-sqlite3');
const db = new Database('/app/data.db');
db.exec("CREATE TABLE IF NOT EXISTS invites (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE NOT NULL, role TEXT NOT NULL, language TEXT, used_by TEXT, created_by TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), used_at TEXT)");
console.log('invites table created');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name).join(', '));
