# Toone

Live audio broadcasting platform for events. A broadcaster goes live, attendees scan a QR code and listen through their phone browsers via WebRTC.

## How It Works

1. **Admin** starts a stream from the web dashboard
2. **Broadcaster** opens the broadcast page and taps the mic to go live
3. **Attendees** scan a QR code and tap to listen in real time

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Media | [mediasoup](https://mediasoup.org/) (WebRTC SFU) |
| Backend | Node.js, Express, TypeScript, Socket.io |
| Frontend | Next.js, React, Tailwind CSS |
| Database | SQLite (better-sqlite3) |
| Auth | JWT + bcrypt |
| Deployment | Docker Compose + nginx + Let's Encrypt |

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3 + build tools (for mediasoup native compilation)

### Development

```bash
# Server
cd server
cp .env.example .env    # set JWT_SECRET and MEDIASOUP_ANNOUNCED_IP
npm install
npm run dev

# Web (separate terminal)
cd web
npm install
npm run dev
```

Server runs on `http://localhost:3001`, web on `http://localhost:3000`.

### Default Login

- Username: `admin`
- Password: `admin` (forced change on first login)

### Production (Docker Compose)

```bash
# Set environment
cp .env.example .env
# Edit .env: PUBLIC_IP, JWT_SECRET, DOMAIN

docker compose up -d --build
```

Requires ports 80, 443 (HTTP/HTTPS) and 10000-10100 (UDP/TCP for WebRTC).

## Project Structure

```
server/          Node.js backend (Express + mediasoup + Socket.io)
web/             Next.js frontend
deploy/          Deployment scripts and nginx configs
brand/           Logo assets and brand guide
docs/            Architecture and user guide
```

## Pages

| Route | Purpose |
|-------|---------|
| `/listen` | Audio player - tap to listen |
| `/qr` | Full-screen QR code for projection |
| `/admin/login` | Sign in |
| `/admin` | Dashboard |
| `/admin/broadcast` | Broadcast controls + mic + audio file playback |
| `/admin/settings` | Page title |
| `/admin/users` | User management + invite QR codes |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Secret for JWT signing |
| `MEDIASOUP_LISTEN_IP` | Transport bind IP (default: `0.0.0.0`) |
| `MEDIASOUP_ANNOUNCED_IP` | Public IP for WebRTC ICE candidates |
| `PORT` | Server port (default: `3001`) |

## License

Private
