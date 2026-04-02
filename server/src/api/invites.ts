import { Router } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import { authMiddleware, requireRole, AuthRequest } from '../auth/middleware';

const router = Router();

// Admin — create invite
router.post('/', authMiddleware, requireRole('admin'), (req: AuthRequest, res) => {
  const { role, language } = req.body;
  const validRoles = ['speaker', 'translator', 'panelist'];
  if (!validRoles.includes(role)) {
    res.status(400).json({ error: 'Role must be speaker, translator, or panelist' });
    return;
  }
  if (role === 'translator' && !language) {
    res.status(400).json({ error: 'Translators must have a language assigned' });
    return;
  }

  const code = uuidv4().split('-')[0]; // short 8-char code
  db.prepare(
    'INSERT INTO invites (code, role, language, created_by) VALUES (?, ?, ?, ?)'
  ).run(code, role, role === 'translator' ? language : null, req.user!.username);

  res.status(201).json({ code, role, language: role === 'translator' ? language : null });
});

// Admin — list invites
router.get('/', authMiddleware, requireRole('admin'), (_req, res) => {
  const invites = db.prepare('SELECT * FROM invites ORDER BY created_at DESC').all();
  res.json(invites);
});

// Admin — delete invite
router.delete('/:id', authMiddleware, requireRole('admin'), (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string, 10);
  db.prepare('DELETE FROM invites WHERE id = ?').run(id);
  res.json({ message: 'Deleted' });
});

// Public — get invite info
router.get('/:code/info', (req, res) => {
  const invite = db.prepare('SELECT code, role, language, used_by FROM invites WHERE code = ?').get(req.params.code) as any;
  if (!invite) {
    res.status(404).json({ error: 'Invalid invite code' });
    return;
  }
  if (invite.used_by) {
    res.status(410).json({ error: 'This invite has already been used' });
    return;
  }
  res.json({ role: invite.role, language: invite.language });
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
    'INSERT INTO admin_users (username, password_hash, must_change_password, role, language, created_by) VALUES (?, ?, 0, ?, ?, ?)'
  ).run(username, hash, invite.role, invite.language, `invite:${invite.created_by}`);

  // Mark invite as used
  db.prepare('UPDATE invites SET used_by = ?, used_at = datetime(?) WHERE id = ?').run(
    username,
    new Date().toISOString(),
    invite.id
  );

  res.status(201).json({ message: 'Account created', role: invite.role });
});

export default router;
