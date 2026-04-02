# Toone — User Guide

## Getting Started

### First Login
1. Go to your Toone instance URL at `/admin/login`
2. Sign in with: `admin` / `admin`
3. You'll be prompted to set a new password — choose something secure (6+ characters)
4. After changing your password, you'll be redirected to the admin dashboard

---

## Admin Dashboard

The admin dashboard is your control center. From here you can access:

- **Broadcaster** — Open the broadcast page to go live
- **QR Page** — Opens the QR code page (for projection at events)
- **Settings** — Configure page title
- **Users** — Manage user accounts

The dashboard also shows the current **stream status** with listener count.

---

## Managing Users

### Creating Users
1. Go to **Users** from the dashboard
2. Click **Add User**
3. Fill in:
   - **Username** — their login name
   - **Password** — temporary password (they'll change it on first login)
4. Click **Create User**

### Inviting Users via QR
1. Go to **Users** from the dashboard
2. Click **Invite via QR**
3. Click **Generate QR Code**
4. Show the QR code to the person — they scan it and create their own account

### Deleting Users
- Click the **Delete** button next to any user (you can't delete yourself)

---

## Broadcasting

### Starting a Stream
1. Go to **Broadcaster** from the dashboard
2. Click **Start Stream**
3. Tap the **microphone button** to begin broadcasting
4. Your browser will ask for microphone permission — allow it
5. You're now live! The button turns red and shows a stop icon

### Controls While Live
- **Stop button** (red circle) — stop your broadcast
- **Mute** — toggle your microphone on/off
- **Audio** — play an audio file through the broadcast:
  1. Click **Audio** to select a file (MP3, WAV, etc.)
  2. Click **Play** to broadcast the file (listeners hear it mixed with your mic)
  3. Click **Stop** to stop playback
  4. Click **Change** to pick a different file

### Stopping the Stream
- Click **Stop Stream** to end the broadcast for all listeners

---

## Listener Experience

### For Attendees
1. Scan the QR code displayed at the event (or go to the listen URL)
2. When the broadcast is live, tap **Tap to Listen**
3. Audio plays through the phone speaker or connected headphones

### QR Code Page (for Projection)
1. From the admin dashboard, click **QR Page**
2. This opens a full-screen page with the QR code and instructions
3. Click the **fullscreen button** (top-right corner) for best projection display
4. If signed in as admin, you can:
   - Set a **talk name** that appears on the page
   - **Download** the QR code as a PNG

---

## Settings

### Page Title
The title shown on the listener page. Default is "Toone".

---

## Deployment

### Redeploying
From the project directory:
```bash
# Build and upload
tar czf /tmp/toone.tar.gz --exclude='node_modules' --exclude='.git' --exclude='.next' --exclude='*.db*' --exclude='*.pem' --exclude='.env' --exclude='dist' .
scp -i deploy/toone.pem toone.tar.gz ec2-user@<SERVER_IP>:/home/ec2-user/

# SSH in and rebuild
ssh -i deploy/toone.pem ec2-user@<SERVER_IP>
cd toone && tar xzf ../toone.tar.gz
sudo docker compose up -d --build
```

### SSL Certificate Renewal
```bash
sudo docker compose run --rm certbot renew
sudo docker compose restart nginx
```

---

## Troubleshooting

### "Failed to fetch" on login
The API URL might be wrong. Check that nginx is running and routing `/api/*` to the server container.

### No audio from broadcast
1. Check that `MEDIASOUP_ANNOUNCED_IP` is set to the server's public IP in `.env`
2. Ensure UDP ports 10000-10100 are open in the security group
3. Try restarting: `sudo docker compose restart server nginx`

### Listeners can't hear anything
1. Make sure the broadcaster is actually live (red mic button active)
2. Listeners must tap "Tap to Listen" — browsers block autoplay
3. Check the browser console for WebRTC errors

### 502 Bad Gateway
Nginx can't reach the backend. Run:
```bash
sudo docker compose restart nginx server
```
