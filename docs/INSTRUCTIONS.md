# TrendAI Tune In — User Guide

## Getting Started

### First Login
1. Go to **https://tune.trendcyberrange.com/admin/login**
2. Sign in with: `admin` / `admin`
3. You'll be prompted to set a new password — choose something secure (6+ characters)
4. After changing your password, you'll be redirected to the admin dashboard

---

## Admin Dashboard

The admin dashboard is your control center. From here you can access:

- **Broadcaster** — Open the broadcast page to go live
- **Tune In Page** — Opens the QR code page (for projection at events)
- **Link App** — QR code for connecting the mobile broadcaster app
- **Settings** — Configure page title, registration fields, and languages
- **Registrations** — View and export attendee data
- **Users** — Manage user accounts and roles

The dashboard also shows the current **stream status** with per-channel listener counts and active broadcasters.

---

## Managing Users

### Creating Users
1. Go to **Users** from the dashboard
2. Click **Add User**
3. Fill in:
   - **Username** — their login name
   - **Password** — temporary password (they'll change it on first login)
   - **Role** — choose one:
     - **Admin** — full access to everything
     - **Speaker** — can start streams and broadcast on the main channel
     - **Translator** — broadcasts on a specific language channel
     - **Panelist** — push-to-talk on the main channel
   - **Language** — only shown for translators; select which language they'll translate to
4. Click **Create User**

### User Roles Explained

| Role | What they can do |
|------|-----------------|
| Admin | Everything — manage users, settings, start/stop streams, broadcast |
| Speaker | Start the stream, broadcast on the main channel, play audio files |
| Translator | Listen to the main channel and broadcast their translation on a separate language channel |
| Panelist | Join the main channel broadcast; must hold a button to speak (prevents feedback) |

---

## Configuring Languages

Before creating translator accounts, set up your languages:

1. Go to **Settings** from the dashboard
2. Scroll down to **Translation Languages**
3. Click **Add Language**
4. Enter a **code** (e.g., `es`, `fr`, `zh`) and **display name** (e.g., `Spanish`, `French`, `Mandarin`)
5. Click **Save Settings**

These languages will appear:
- In the **Users** page when assigning translators
- On the **Listen** page for attendees to choose their language

---

## Broadcasting

### Starting a Stream
1. Go to **Broadcaster** from the dashboard (or sign in as a speaker)
2. Click **Start Stream** (admin/speaker only)
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
- Admin can click **Stop Stream** to end the entire broadcast session for all channels

---

## Translator Workflow

1. Admin creates a translator account with an assigned language
2. Translator signs in at `/admin/login`
3. They're redirected to the broadcast page showing "Channel: Translation: ES" (or their language)
4. Once the admin/speaker starts the stream, the translator taps the mic button
5. The translator hears the main channel audio through their device (monitor)
6. They speak their translation — it goes to their language channel only
7. Listeners who selected that language hear the translator instead of the original speaker

**Tip**: Translators should use headphones to prevent the main channel audio from feeding back into their microphone.

---

## Panelist Workflow

Panelists use **push-to-talk** to prevent audio feedback when multiple people are in the same room.

1. Admin creates a panelist account
2. Panelist signs in → redirected to broadcast page
3. Once the stream is started, they tap the mic button to connect
4. They see a large **"Hold to speak"** button
5. **Press and hold** the button to unmute and speak
6. **Release** to mute — listeners won't hear them until they press again

---

## Listener Experience

### For Attendees
1. Scan the QR code displayed at the event (or go to the listen URL)
2. Fill in the registration form (fields are customizable by admin)
3. If translation languages are available, select your preferred language:
   - **Original** — hear the speaker directly
   - **Spanish**, **French**, etc. — hear the translator for that language
   - Green dot = translator is active; gray dot = no translator broadcasting
4. Tap **Tap to Listen** to start hearing the broadcast
5. You can switch languages at any time

### QR Code Page (for Projection)
1. From the admin dashboard, click **Tune In Page**
2. This opens a full-screen page with the QR code and instructions
3. Click the **fullscreen button** (top-right corner) for best projection display
4. If signed in as admin, you can:
   - Set a **talk name** that appears on the page
   - **Download** the QR code as a PNG

---

## Settings

### Page Title
The title shown on the listener registration page and QR display page.

### Registration Fields
Customize what information you collect from attendees:
- Add/remove fields
- Set field types: Text, Email, Phone, Dropdown, Checkbox
- Mark fields as required
- Reorder with up/down arrows

### Translation Languages
Add languages that will be available for translation channels. Each language needs:
- **Code** — short identifier (e.g., `es`, `fr`)
- **Display Name** — what listeners see (e.g., `Spanish`, `French`)

---

## Exporting Registration Data

1. Go to **Registrations** from the dashboard
2. View all registered attendees in a table
3. Click **Export CSV** to download all data as a spreadsheet
4. Click **Clear All** to delete all registration data (cannot be undone)

---

## Deployment

### Current Deployment
- **URL**: https://tune.trendcyberrange.com
- **Server**: AWS EC2 (us-west-2)
- **SSH**: `ssh -i trendai-tunein.pem ec2-user@35.92.4.174`

### Redeploying
From the project directory:
```bash
# Build and upload
tar czf /tmp/trendaitunein.tar.gz --exclude='node_modules' --exclude='.git' --exclude='.next' --exclude='*.db*' --exclude='*.pem' --exclude='.env' --exclude='dist' .
scp -i deploy/trendai-tunein.pem trendaitunein.tar.gz ec2-user@35.92.4.174:/home/ec2-user/

# SSH in and rebuild
ssh -i deploy/trendai-tunein.pem ec2-user@35.92.4.174
cd trendaitunein && tar xzf ../trendaitunein.tar.gz
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

### Database migration issues
If new columns are missing, run manually inside the container:
```bash
sudo docker compose exec server node -e "
const Database = require('better-sqlite3');
const db = new Database('/app/data.db');
try { db.exec(\"ALTER TABLE admin_users ADD COLUMN role TEXT DEFAULT 'admin'\"); } catch(e) {}
try { db.exec('ALTER TABLE admin_users ADD COLUMN language TEXT'); } catch(e) {}
db.exec(\"UPDATE admin_users SET role = 'admin' WHERE role IS NULL\");
"
sudo docker compose restart server
```
