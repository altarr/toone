# Toone — Architecture Document

## System Overview

Toone is a real-time audio broadcasting platform built for live events. A broadcaster sends audio via WebRTC and listeners tune in through their phone browsers.

```
[Broadcaster]                    [Listeners]
      |                         /    |    \
      | WebRTC (produce)       WebRTC (consume)
      v                         v    v    v
+------------------------------------------------------------------+
|                     Node.js Server                                |
|  Express + Socket.io + mediasoup (SFU)                           |
|                                                                  |
|  Main Channel: broadcaster → N listeners                         |
|                                                                  |
|  SQLite: users, settings                                         |
+------------------------------------------------------------------+
      |                    |                    |
   [nginx]           [Next.js]           [Let's Encrypt]
   reverse proxy     frontend            SSL certificates
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Media Server | mediasoup 3.14 | WebRTC SFU — routes audio from producer to consumers |
| Backend | Node.js + Express + TypeScript | REST API, auth, database |
| Realtime | Socket.io 4.8 | WebRTC signaling (SDP/ICE exchange), stream state |
| Frontend | Next.js 16 + React 19 + Tailwind v4 | Server-rendered web app |
| WebRTC Client | mediasoup-client 3.18 | Browser WebRTC API wrapper |
| Database | SQLite (better-sqlite3) | Users, settings |
| Auth | JWT + bcrypt | Token-based authentication |
| QR Codes | qrcode npm | QR code generation |
| Reverse Proxy | nginx | HTTPS termination, WebSocket proxying |
| SSL | Let's Encrypt (certbot) | Automated certificate management |
| Deployment | Docker Compose | Container orchestration |

## Server Architecture

### Directory Structure

```
server/src/
├── index.ts           # Entry point: Express + Socket.io + mediasoup init
├── config.ts          # Environment config, mediasoup codec/transport settings
├── db.ts              # SQLite schema, migrations, default seed data
├── auth/
│   ├── middleware.ts   # JWT validation middleware
│   ├── routes.ts      # POST /login, /change-password, GET /me
│   └── users.ts       # GET/POST/DELETE /users
├── api/
│   ├── stream.ts      # GET /status, POST /start, /stop
│   ├── settings.ts    # GET /public, GET /, PUT /
│   └── invites.ts     # Invite code management
├── media/
│   ├── mediasoup.ts   # Worker, Router, WebRTC Transport factory
│   └── rooms.ts       # Stream state management
└── signaling/
    └── handlers.ts    # Socket.io event handlers for WebRTC negotiation
```

### Database Schema

**`admin_users`** — All authenticated users

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| username | TEXT UNIQUE | Login username |
| password_hash | TEXT | bcrypt hash (10 rounds) |
| must_change_password | INTEGER | 1 = force change on next login |
| created_by | TEXT | Username who created this account |
| created_at | TEXT | ISO datetime |

**`settings`** — Key-value configuration

| Key | Value Type | Description |
|-----|-----------|-------------|
| page_title | string | Title shown on listen page |
| talk_name | string | Current talk/session name |

**`invites`** — Invite codes for user registration

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| code | TEXT UNIQUE | Invite code |
| used_by | TEXT | Username who used the invite |
| created_by | TEXT | Username who created the invite |
| created_at | TEXT | ISO datetime |
| used_at | TEXT | ISO datetime when used |

### REST API Endpoints

#### Authentication (`/api/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /login | - | Returns JWT token + user info |
| POST | /change-password | JWT | Change password (forced on first login) |
| GET | /me | JWT | Current user info |

#### Users (`/api/users`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | JWT | List all users |
| POST | / | JWT | Create user |
| DELETE | /:id | JWT | Delete user |

#### Stream (`/api/stream`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /status | - | Stream state |
| POST | /start | JWT | Start broadcast session |
| POST | /stop | JWT | Stop broadcast |

#### Settings (`/api/settings`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /public | - | Public settings (title) |
| GET | / | JWT | All settings |
| PUT | / | JWT | Update setting (key + value) |

#### Invites (`/api/invites`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | JWT | List all invites |
| POST | / | JWT | Create invite code |
| GET | /:code/info | - | Check invite validity |
| POST | /:code/register | - | Register via invite |
| DELETE | /:id | JWT | Delete invite |

### Socket.io Events

#### Producer Events (Broadcaster)
| Event | Payload | Response | Description |
|-------|---------|----------|-------------|
| createProducerTransport | {token} | {params} | Create send transport |
| connectProducerTransport | {dtlsParameters} | {} | DTLS handshake |
| produce | {kind, rtpParameters} | {id} | Start sending audio |

#### Consumer Events (Listeners)
| Event | Payload | Response | Description |
|-------|---------|----------|-------------|
| createConsumerTransport | {} | {params} | Create receive transport |
| connectConsumerTransport | {dtlsParameters} | {} | DTLS handshake |
| consume | {rtpCapabilities} | consumer params | Subscribe to audio |
| getRouterRtpCapabilities | {} | RTP capabilities | Get codec info for Device |

#### Broadcast Events
| Event | Direction | Description |
|-------|-----------|-------------|
| streamState | server → all clients | Stream status + listener count |
| producerReady | server → waiting clients | Notifies when broadcaster starts |

### mediasoup Configuration

- **Codec**: Opus (48kHz, 2 channels)
- **RTC Port Range**: 10000-10100 (UDP + TCP)
- **Transport Bitrate**: 1.5 Mbps max incoming, 1 Mbps initial outgoing
- **Worker**: Single worker (supports ~200-500 audio-only consumers)

## Frontend Architecture

### Pages

| Route | Access | Purpose |
|-------|--------|---------|
| `/` | Public | Redirects to /listen |
| `/listen` | Public | Audio player — tap to listen |
| `/qr` | Public | Full-screen QR code for projection |
| `/admin/login` | Public | Sign in |
| `/admin` | Authenticated | Dashboard: stream status, navigation |
| `/admin/broadcast` | Authenticated | Broadcast controls, mic, mute, audio file playback |
| `/admin/settings` | Authenticated | Page title configuration |
| `/admin/users` | Authenticated | User management + invite QR codes |
| `/invite/[code]` | Public | Account creation via invite |

### Audio Mixing (Broadcast Page)
```
Microphone → GainNode (micGain) ─┐
                                  ├→ MediaStreamDestination → WebRTC Producer
Audio File → GainNode (fileGain) ─┘
```
The Web Audio API mixes mic and file audio into a single stream that's sent via WebRTC.

## Deployment Architecture

### Docker Compose Services

| Service | Image | Ports | Purpose |
|---------|-------|-------|---------|
| server | Custom (node:20-bullseye) | 3001 (internal), 10000-10100 UDP/TCP | Backend + mediasoup |
| web | Custom (node:20-alpine) | 3000 (internal) | Next.js frontend |
| nginx | nginx:alpine | 80, 443 | Reverse proxy + SSL |
| certbot | certbot/certbot | - | SSL certificate renewal |

### nginx Routing

| Path | Upstream | Notes |
|------|----------|-------|
| `/api/*` | server:3001 | REST API |
| `/socket.io/*` | server:3001 | WebSocket upgrade, 86400s timeout |
| `/*` | web:3000 | Next.js pages |

### Environment Variables

| Variable | Description |
|----------|-------------|
| PORT | Server port (default: 3001) |
| JWT_SECRET | Secret for JWT signing |
| MEDIASOUP_LISTEN_IP | Transport bind IP (0.0.0.0) |
| MEDIASOUP_ANNOUNCED_IP | Public IP for ICE candidates |

## Security

- **Passwords**: bcrypt with 10 rounds, forced change on first login
- **JWT**: 24h expiration
- **HTTPS**: Required for WebRTC in production (Let's Encrypt)
- **SQL**: Parameterized queries via better-sqlite3 prepared statements
- **CORS**: Enabled globally (restrict in production if needed)
- **WebRTC Auth**: Producer transport creation requires valid JWT
