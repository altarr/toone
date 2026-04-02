# TrendAI Tune In — Architecture Document

## System Overview

TrendAI Tune In is a real-time audio broadcasting platform built for live events. Speakers broadcast their voice, translators provide simultaneous interpretation on separate channels, panelists participate via push-to-talk, and attendees listen through their phone browsers.

```
[Speakers/Panelists]          [Translators]              [Listeners]
      |                            |                     /    |    \
      | WebRTC (produce)           | WebRTC (produce)   WebRTC (consume)
      v                            v                     v    v    v
+------------------------------------------------------------------+
|                     Node.js Server                                |
|  Express + Socket.io + mediasoup (SFU)                           |
|                                                                  |
|  Main Channel:  speaker + panelists → N listeners                |
|  ES Channel:    Spanish translator → N listeners                 |
|  FR Channel:    French translator → N listeners                  |
|                                                                  |
|  SQLite: users, settings, registrations                          |
+------------------------------------------------------------------+
      |                    |                    |
   [nginx]           [Next.js]           [Let's Encrypt]
   reverse proxy     frontend            SSL certificates
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Media Server | mediasoup 3.14 | WebRTC SFU — routes audio from producers to consumers |
| Backend | Node.js + Express + TypeScript | REST API, auth, database |
| Realtime | Socket.io 4.8 | WebRTC signaling (SDP/ICE exchange), stream state |
| Frontend | Next.js 16 + React 19 + Tailwind v4 | Server-rendered web app |
| WebRTC Client | mediasoup-client 3.18 | Browser WebRTC API wrapper |
| Database | SQLite (better-sqlite3) | Users, settings, registrations |
| Auth | JWT + bcrypt | Token-based authentication with role-based access |
| QR Codes | qrcode npm | Branded QR code generation |
| Reverse Proxy | nginx | HTTPS termination, WebSocket proxying |
| SSL | Let's Encrypt (certbot) | Automated certificate management |
| Deployment | Docker Compose | Container orchestration |

## User Roles

| Role | Permissions |
|------|------------|
| **Admin** | Full access: manage users, settings, start/stop streams, broadcast |
| **Speaker** | Start/stop streams, broadcast on main channel |
| **Translator** | Broadcast on assigned language channel, monitor main channel |
| **Panelist** | Push-to-talk on main channel (hold = unmuted, release = muted) |

## Server Architecture

### Directory Structure

```
server/src/
├── index.ts           # Entry point: Express + Socket.io + mediasoup init
├── config.ts          # Environment config, mediasoup codec/transport settings
├── db.ts              # SQLite schema, migrations, default seed data
├── auth/
│   ├── middleware.ts   # JWT validation, requireRole() middleware
│   ├── routes.ts      # POST /login, /change-password, GET /me
│   └── users.ts       # GET/POST/DELETE /users (admin CRUD)
├── api/
│   ├── stream.ts      # GET /status, POST /start, /stop
│   ├── settings.ts    # GET /public, GET /, PUT /
│   └── registration.ts # POST /, GET /, GET /export, DELETE /
├── media/
│   ├── mediasoup.ts   # Worker, Router, WebRTC Transport factory
│   └── rooms.ts       # Multi-channel room state management
└── signaling/
    └── handlers.ts    # Socket.io event handlers for WebRTC negotiation
```

### Database Schema

**`admin_users`** — All authenticated users (not just admins)

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| username | TEXT UNIQUE | Login username |
| password_hash | TEXT | bcrypt hash (10 rounds) |
| must_change_password | INTEGER | 1 = force change on next login |
| role | TEXT | admin, speaker, translator, panelist |
| language | TEXT | Language code for translators (e.g., "es") |
| created_by | TEXT | Username who created this account |
| created_at | TEXT | ISO datetime |

**`settings`** — Key-value configuration

| Key | Value Type | Description |
|-----|-----------|-------------|
| page_title | string | Title shown on listen page |
| talk_name | string | Current talk/session name |
| languages | JSON array | `[{code:"es", name:"Spanish"}, ...]` |
| registration_fields | JSON array | Dynamic form field definitions |

**`registrations`** — Attendee registration data

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| session_id | TEXT | Stream session UUID |
| data | TEXT | JSON form data |
| registered_at | TEXT | ISO datetime |

### REST API Endpoints

#### Authentication (`/api/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /login | - | Returns JWT token + user info |
| POST | /change-password | JWT | Change password (forced on first login) |
| GET | /me | JWT | Current user info |

#### Users (`/api/users`)
| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | / | JWT | any | List all users |
| POST | / | JWT | admin | Create user with role/language |
| DELETE | /:id | JWT | admin | Delete user |

#### Stream (`/api/stream`)
| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | /status | - | - | Stream state + per-channel info |
| POST | /start | JWT | admin, speaker | Start broadcast session |
| POST | /stop | JWT | admin | Stop all channels |

#### Settings (`/api/settings`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /public | - | Public settings (title, fields, languages) |
| GET | / | JWT | All settings |
| PUT | / | JWT | Update setting (key + value) |

#### Registrations (`/api/registrations`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | / | - | Submit registration |
| GET | / | JWT | List registrations |
| GET | /export | JWT | Download CSV |
| DELETE | / | JWT | Clear all |

### Socket.io Events

#### Producer Events (Broadcasters)
| Event | Payload | Response | Description |
|-------|---------|----------|-------------|
| createProducerTransport | {token, channel} | {params} | Create send transport |
| connectProducerTransport | {dtlsParameters, channel} | {} | DTLS handshake |
| produce | {kind, rtpParameters, channel, paused} | {id} | Start sending audio |
| pauseProducer | {channel} | {} | Mute (panelist push-to-talk release) |
| resumeProducer | {channel} | {} | Unmute (panelist push-to-talk press) |

#### Consumer Events (Listeners)
| Event | Payload | Response | Description |
|-------|---------|----------|-------------|
| createConsumerTransport | {channel} | {params} | Create receive transport |
| connectConsumerTransport | {dtlsParameters, channel} | {} | DTLS handshake |
| consume | {rtpCapabilities, channel} | consumer params | Subscribe to channel producers |
| getRouterRtpCapabilities | {} | RTP capabilities | Get codec info for Device |

#### Broadcast Events
| Event | Direction | Description |
|-------|-----------|-------------|
| streamState | server → all clients | Stream status + per-channel info |

### Multi-Channel Media Architecture

```
Main Channel ("main"):
  Producers: Speaker + Panelists (multiple)
  Consumers: Listeners who selected "Original"

Translation Channel ("es"):
  Producers: Spanish Translator (single)
  Consumers: Listeners who selected "Spanish"

Translation Channel ("fr"):
  Producers: French Translator (single)
  Consumers: Listeners who selected "French"
```

Each channel is independent. A listener subscribes to one channel at a time. Translators monitor the main channel audio while broadcasting on their language channel.

### mediasoup Configuration

- **Codec**: Opus (48kHz, 2 channels, error correction level H)
- **RTC Port Range**: 10000-10100 (UDP + TCP)
- **Transport Bitrate**: 1.5 Mbps max incoming, 1 Mbps initial outgoing
- **Worker**: Single worker (supports ~200-500 audio-only consumers on 4-core machine)

## Frontend Architecture

### Pages

| Route | Access | Purpose |
|-------|--------|---------|
| `/` | Public | Redirects to /listen |
| `/listen` | Public | Registration form → language selector → audio player |
| `/qr` | Public | Full-screen QR code for projection (with fullscreen toggle) |
| `/admin/login` | Public | Sign-in for all roles |
| `/admin` | Admin | Dashboard: stream status, navigation cards |
| `/admin/broadcast` | Admin/Speaker/Translator/Panelist | Broadcast controls, mic, mute, push-to-talk, audio file playback |
| `/admin/settings` | Admin | Page title, registration fields, languages |
| `/admin/users` | Any authenticated | User list; admin can create/delete |
| `/admin/registrations` | Admin | View + CSV export |

### Broadcast Page Features
- **Start/Stop Stream** (admin/speaker only)
- **Mic button** with mute toggle
- **Push-to-talk** for panelists (hold to speak)
- **Audio file playback** mixed into broadcast stream
- **Translator monitor** listens to main channel while broadcasting
- **Channel label** shows which channel you're broadcasting on

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
- **JWT**: 24h expiration, includes role for RBAC
- **RBAC**: `requireRole()` middleware on protected routes
- **HTTPS**: Required for WebRTC in production (Let's Encrypt)
- **SQL**: Parameterized queries via better-sqlite3 prepared statements
- **CORS**: Enabled globally (restrict in production if needed)
- **WebRTC Auth**: Producer transport creation requires valid JWT
