import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { config } from './config';
import { initDb } from './db';
import { createWorker } from './media/mediasoup';
import { setupSignaling } from './signaling/handlers';
import authRoutes from './auth/routes';
import userRoutes from './auth/users';
import settingsRoutes from './api/settings';
import streamRoutes from './api/stream';
import inviteRoutes from './api/invites';

async function main() {
  // Initialize database
  initDb();

  // Create mediasoup worker
  await createWorker();

  const app = express();
  const server = http.createServer(app);

  // Socket.io
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/stream', streamRoutes);
  app.use('/api/invites', inviteRoutes);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Setup WebRTC signaling
  setupSignaling(io);

  server.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
