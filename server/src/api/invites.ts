import { Router } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import { authMiddleware, AuthRequest } from '../auth/middleware';

const router = Router();

// Create invite
router.post('/', authMiddleware, (req: AuthRequest, res) => {
  const code = uuidv4().split('-')[0];
  db.prepare(
    'INSERT INTO invites (code, role, created_by) VALUES (?, ?, ?)'
  ).run(code, 'admin', req.user!.username);

  res.status(201).json({ code });
});

// List invites
router.get('/', authMiddleware, (_req, res) => {
  const invites = db.prepare('SELECT * FROM invites ORDER BY created_at DESC').all();
  res.json(invites);
});

// Delete invite
router.delete('/:id', authMiddleware, (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string, 10);
  db.prepare('DELETE FROM invites WHERE id = ?').run(id);
  res.json({ message: 'Deleted' });
});

// Public — get invite info
router.get('/:code/info', (req, res) => {
  const invite = db.prepare('SELECT code, used_by FROM invites WHERE code = ?').get(req.params.code) as any;
  if (!invite) {
    res.status(404).json({ error: 'Invalid invite code' });
    return;
  }
  if (invite.used_by) {
    res.status(410).json({ error: 'This invite has already been used' });
    return;
  }
  res.json({ valid: true });
});

// Public — register with invite code
router.post('/:code/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  const invite = db.prepare('SELECT * FROM invites WHERE code = ?').get(req.params.code) as any;
  if (!invite) {
    res.status(404).json({ error: 'Invalid invite code' });
    return;
  }
  if (invite.used_by) {
    res.status(410).json({ error: 'This invite has already been used' });
    return;
  }

  const existing = db.prepare('SELECT id FROM admin_users WHERE username = ?').get(username);
  if (existing) {
    res.status(409).json({ error: 'Username already exists' });
    return;
  }

  const hash = bcrypt.hashSync(password, 10);
  db.prepare(
    'INSERT INTO admin_users (username, password_hash, must_change_password, role, created_by) VALUES (?, ?, 0, ?, ?)'
  ).run(username, hash, 'admin', `invite:${invite.created_by}`);

  db.prepare('UPDATE invites SET used_by = ?, used_at = datetime(?) WHERE id = ?').run(
    username,
    new Date().toISOString(),
    invite.id
  );

  res.status(201).json({ message: 'Account created' });
});

export default router;
