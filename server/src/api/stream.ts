import { Router } from 'express';
import { authMiddleware, requireRole, AuthRequest } from '../auth/middleware';
import { getStreamState, startStream, stopStream } from '../media/rooms';

const router = Router();

router.get('/status', (_req, res) => {
  res.json(getStreamState());
});

router.post('/start', authMiddleware, requireRole('admin', 'speaker'), (req: AuthRequest, res) => {
  const { title } = req.body;
  const state = startStream(title);
  res.json(state);
});

router.post('/stop', authMiddleware, requireRole('admin'), (_req, res) => {
  stopStream();
  res.json({ live: false });
});

export default router;
