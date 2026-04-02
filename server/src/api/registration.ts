import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../db';
import { config } from '../config';
import { authMiddleware } from '../auth/middleware';

const router = Router();

// Public — submit registration
router.post('/', (req, res) => {
  const { sessionId, data } = req.body;
  if (!data || typeof data !== 'object') {
    res.status(400).json({ error: 'Registration data required' });
    return;
  }

  const result = db
    .prepare('INSERT INTO registrations (session_id, data) VALUES (?, ?)')
    .run(sessionId || null, JSON.stringify(data));

  res.status(201).json({ id: result.lastInsertRowid });
});

// Admin — list registrations
router.get('/', authMiddleware, (req, res) => {
  const sessionId = req.query.sessionId as string | undefined;
  let rows;
  if (sessionId) {
    rows = db
      .prepare('SELECT * FROM registrations WHERE session_id = ? ORDER BY registered_at DESC')
      .all(sessionId);
  } else {
    rows = db.prepare('SELECT * FROM registrations ORDER BY registered_at DESC').all();
  }

  const parsed = (rows as any[]).map((r) => ({
    ...r,
    data: JSON.parse(r.data),
  }));
  res.json(parsed);
});

// Auth middleware that also accepts token as query param (for download links)
function exportAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.query.token as string;
  if (token) {
    try {
      jwt.verify(token, config.jwtSecret);
      next();
      return;
    } catch {}
  }
  authMiddleware(req, res, next);
}

// Admin — export CSV
router.get('/export', exportAuth, (_req, res) => {
  const rows = db
    .prepare('SELECT * FROM registrations ORDER BY registered_at DESC')
    .all() as any[];

  if (rows.length === 0) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="registrations.csv"');
    res.send('No registrations');
    return;
  }

  // Gather all unique field keys across all registrations
  const allKeys = new Set<string>();
  const parsed = rows.map((r) => {
    const data = JSON.parse(r.data);
    Object.keys(data).forEach((k) => allKeys.add(k));
    return { ...r, data };
  });

  const fieldKeys = Array.from(allKeys);
  const headers = ['id', 'session_id', ...fieldKeys, 'registered_at'];

  const csvRows = [headers.join(',')];
  for (const row of parsed) {
    const values = [
      row.id,
      row.session_id || '',
      ...fieldKeys.map((k) => {
        const val = String(row.data[k] || '').replace(/"/g, '""');
        return `"${val}"`;
      }),
      row.registered_at,
    ];
    csvRows.push(values.join(','));
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="registrations.csv"');
  res.send(csvRows.join('\n'));
});

// Admin — delete all registrations
router.delete('/', authMiddleware, (_req, res) => {
  db.prepare('DELETE FROM registrations').run();
  res.json({ message: 'All registrations deleted' });
});

export default router;
