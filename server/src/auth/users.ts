import { Router } from 'express';
import bcrypt from 'bcrypt';
import db from '../db';
import { authMiddleware, AuthRequest } from './middleware';

const router = Router();
router.use(authMiddleware);

router.get('/', (req: AuthRequest, res) => {
  const users = db
    .prepare('SELECT id, username, must_change_password, created_by, created_at FROM admin_users')
    .all();
  res.json(users);
});

router.post('/', (req: AuthRequest, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
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
      'INSERT INTO admin_users (username, password_hash, must_change_password, role, created_by) VALUES (?, ?, 1, ?, ?)'
    )
    .run(username, hash, 'admin', req.user!.username);

  res.status(201).json({
    id: result.lastInsertRowid,
    username,
    must_change_password: true,
    created_by: req.user!.username,
  });
});

router.delete('/:id', (req: AuthRequest, res) => {
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
