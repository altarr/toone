import { Router } from 'express';
import db from '../db';
import { authMiddleware } from '../auth/middleware';

const router = Router();

// Public - listeners need page_title
router.get('/public', (_req, res) => {
  const rows = db
    .prepare("SELECT key, value FROM settings WHERE key IN ('page_title', 'talk_name')")
    .all() as { key: string; value: string }[];

  const settings: Record<string, any> = {};
  for (const row of rows) {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  }
  res.json(settings);
});

// Admin - get all settings
router.get('/', authMiddleware, (_req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all() as {
    key: string;
    value: string;
  }[];
  const settings: Record<string, any> = {};
  for (const row of rows) {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  }
  res.json(settings);
});

// Admin - update settings
router.put('/', authMiddleware, (req, res) => {
  const { key, value } = req.body;
  if (!key) {
    res.status(400).json({ error: 'Key is required' });
    return;
  }

  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, serialized);
  res.json({ key, value });
});

export default router;
