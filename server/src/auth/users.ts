import { Router } from 'express';
import bcrypt from 'bcrypt';
import db from '../db';
import { authMiddleware, AuthRequest, requireRole } from './middleware';

const router = Router();
router.use(authMiddleware);

router.get('/', (req: AuthRequest, res) => {
  const users = db
    .prepare('SELECT id, username, must_change_password, role, language, created_by, created_at FROM admin_users')
    .all();
  res.json(users);
});

router.post('/', requireRole('admin'), (req: AuthRequest, res) => {
  const { username, password, role, language } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  const validRoles = ['admin', 'speaker', 'translator', 'panelist'];
  const userRole = validRoles.includes(role) ? role : 'admin';

  if (userRole === 'translator' && !language) {
    res.status(400).json({ error: 'Translators must have a language assigned' });
    return;
  }

  const existing = db.prepare('SELECT id FROM admin_users WHERE username = ?').get(username);
  if (existing) {
    res.status(409).json({ error: 'Username already exists' });
    return;
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db
    .prepare(
      'INSERT INTO admin_users (username, password_hash, must_change_password, role, language, created_by) VALUES (?, ?, 1, ?, ?, ?)'
    )
    .run(username, hash, userRole, userRole === 'translator' ? language : null, req.user!.username);

  res.status(201).json({
    id: result.lastInsertRowid,
    username,
    must_change_password: true,
    role: userRole,
    language: userRole === 'translator' ? language : null,
    created_by: req.user!.username,
  });
});

// Update user role/language
router.patch('/:id', requireRole('admin'), (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string, 10);
  const { role, language } = req.body;

  const validRoles = ['admin', 'speaker', 'translator', 'panelist'];
  if (role && !validRoles.includes(role)) {
    res.status(400).json({ error: 'Invalid role' });
    return;
  }
  if (role === 'translator' && !language) {
    res.status(400).json({ error: 'Translators must have a language assigned' });
    return;
  }

  const updates: string[] = [];
  const values: any[] = [];
  if (role) { updates.push('role = ?'); values.push(role); }
  if (role === 'translator') { updates.push('language = ?'); values.push(language); }
  else if (role) { updates.push('language = NULL'); }

  if (updates.length === 0) {
    res.status(400).json({ error: 'Nothing to update' });
    return;
  }

  values.push(id);
  db.prepare(`UPDATE admin_users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const user = db.prepare('SELECT id, username, role, language FROM admin_users WHERE id = ?').get(id);
  res.json(user);
});

router.delete('/:id', requireRole('admin'), (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string, 10);
  if (id === req.user!.id) {
    res.status(400).json({ error: 'Cannot delete your own account' });
    return;
  }

  const result = db.prepare('DELETE FROM admin_users WHERE id = ?').run(id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({ message: 'User deleted' });
});

export default router;
