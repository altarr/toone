import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../db';
import { config } from '../config';
import { authMiddleware, AuthRequest } from './middleware';

const router = Router();

function makeToken(user: any) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      must_change_password: !!user.must_change_password,
      role: user.role || 'admin',
    },
    config.jwtSecret,
    { expiresIn: '24h' }
  );
}

function userResponse(user: any) {
  return {
    id: user.id,
    username: user.username,
    must_change_password: !!user.must_change_password,
    role: user.role || 'admin',
  };
}

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }

  const user = db
    .prepare('SELECT * FROM admin_users WHERE username = ?')
    .get(username) as any;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  res.json({ token: makeToken(user), user: userResponse(user) });
});

router.post('/change-password', authMiddleware, (req: AuthRequest, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters' });
    return;
  }

  const user = db
    .prepare('SELECT * FROM admin_users WHERE id = ?')
    .get(req.user!.id) as any;

  if (!user.must_change_password) {
    if (!currentPassword || !bcrypt.compareSync(currentPassword, user.password_hash)) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE admin_users SET password_hash = ?, must_change_password = 0 WHERE id = ?').run(
    hash,
    req.user!.id
  );

  const updated = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(req.user!.id) as any;
  res.json({ token: makeToken(updated), message: 'Password changed successfully' });
});

router.get('/me', authMiddleware, (req: AuthRequest, res) => {
  res.json({ user: req.user });
});

export default router;
