# Placeonix Hub

Student, Mentor & Admin portal for **Placeonix** — an IT training & placement institute
(Hyderabad). Three role-based dashboards on top of a Node.js + MongoDB REST API.

> TRAINING · PLACEMENT · FUTURE

---

## 1. What's in this repo

| Path | What it is |
|------|-----------|
| `placeonix-hub-portal.html` | The **dashboard app** (login + admin/mentor/student portals). Single self-contained HTML file — vanilla JS + CSS, no build step. |
| `placeonix-website.html` | Public marketing website. |
| `placeonix-logo.png`, `login-illustration.svg` | Brand assets used by the portal. |
| `placeonix-hub-backend/` | The **Node.js / Express REST API** + MongoDB models, seeder, etc. |
| `_serve.js` | Tiny static file server for the portal during local dev (port 8080). |

---

## 2. Tech stack

**Frontend**
- Plain **HTML + CSS + vanilla JavaScript** (no framework, no build).
- Talks to the API with `fetch()`. Uses same-origin `/api/v1` in production, `http://localhost:5000` in local dev.
- Has a built-in **demo mode**: if the API is unreachable it falls back to sample data so the UI still works.

**Backend** (`placeonix-hub-backend/`)
- **Node.js (≥ 18) + Express** REST API, versioned under `/api/v1`.
- **MongoDB** database via **Mongoose** ODM (the only datastore — no SQL/Redis).
- **JWT** auth (access + refresh tokens), passwords hashed with **bcryptjs**.
- Security: `helmet`, `cors`, `express-rate-limit`, `express-mongo-sanitize`, `hpp`, `xss-clean`, `cookie-parser`.
- Validation: `express-validator`. Uploads: `multer` (local `uploads/`). Email: `nodemailer`.
- Background jobs: `node-cron`. Logging: `winston`. Config: `dotenv`.
- Architecture: `models/` → `controllers/` → `routes/`, plus `middleware/`, `services/`, `utils/`, `config/`, `seeders/`.

**Data models:** User, Course, Batch, Enrollment, Session, Attendance, Assignment,
Announcement, PlacementDrive, Notification, Lead, Review, Resource, Payment, Certificate.

---

## 3. Run it locally

### Prerequisites
- **Node.js ≥ 18**
- **MongoDB** running locally (`mongodb://localhost:27017`) — or a MongoDB Atlas URI.

### Step 1 — Backend
```bash
cd placeonix-hub-backend
npm install
copy .env.example .env        # macOS/Linux: cp .env.example .env
# edit .env — at minimum set MONGO_URI and the JWT secrets
npm run seed                  # loads demo data (students, mentors, courses, etc.)
npm run dev                   # starts API on http://localhost:5000
```

### Step 2 — Frontend
Either open `placeonix-hub-portal.html` directly, **or** serve it over HTTP (recommended):
```bash
node _serve.js                # serves the portal at http://localhost:8080
```
Then open **http://localhost:8080**.

### Demo logins (after `npm run seed`)
| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@placeonix.in` | `Password123` |
| Mentor | `mentor@placeonix.in` | `Password123` |
| Student | `student@placeonix.in` | `Password123` |

The seeder populates **every** dashboard with working data: 17 courses, 3 batches
(online / hybrid / offline), enrollments, live + recorded sessions with schedules,
attendance, leads, payments, certificates, reviews, placements and announcements.

---

## 4. Useful backend commands
```bash
npm run dev        # start API with auto-reload (nodemon)
npm start          # start API (production, plain node)
npm run seed       # wipe + reload demo data
npm test           # run the Jest test suite
```

---

## 5. Deploy to a VPS (Hostinger KVM plan, Ubuntu)

This is the recommended setup for **Hostinger KVM4** (full VPS, root access). Cron jobs
and file uploads work normally here (unlike serverless).

### 5.1 Install prerequisites on the server
```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git nginx

# MongoDB Community Server (Ubuntu 22.04 example)
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update && sudo apt-get install -y mongodb-org
sudo systemctl enable --now mongod

# PM2 process manager
sudo npm install -g pm2
```
> Prefer managed DB? Skip the MongoDB install and use a **MongoDB Atlas** connection
> string in `.env` instead.

### 5.2 Get the code & configure
```bash
git clone https://github.com/sowjanya-design/Placeonix_Dashboard.git
cd Placeonix_Dashboard/placeonix-hub-backend
npm install --production
cp .env.example .env
nano .env
```
Set in `.env`:
```
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb://localhost:27017/placeonix-hub
JWT_SECRET=<long-random-string>
JWT_REFRESH_SECRET=<different-long-random-string>
CLIENT_URL=https://yourdomain.com
DISABLE_CRON=false
# SMTP_* values if you want email notifications
```
Seed once (or import your real data instead):
```bash
npm run seed
```

### 5.3 Run the API with PM2
```bash
pm2 start src/server.js --name placeonix-api
pm2 save
pm2 startup        # run the command it prints, so it survives reboots
```

### 5.4 Point the frontend at the API
The portal auto-uses same-origin `/api/v1` in production, so just serve the HTML files
from the repo root via Nginx (next step). No code change needed.

### 5.5 Nginx reverse proxy + static files
Create `/etc/nginx/sites-available/placeonix`:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Static frontend (portal + website)
    root /root/Placeonix_Dashboard;
    index placeonix-hub-portal.html;

    location = / { try_files /placeonix-hub-portal.html =404; }

    # API -> Node app
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # uploaded files served by the API
    location /uploads/ { proxy_pass http://localhost:5000; }

    location / { try_files $uri $uri/ /placeonix-hub-portal.html; }
}
```
Enable + reload:
```bash
sudo ln -s /etc/nginx/sites-available/placeonix /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 5.6 Free HTTPS (Let's Encrypt)
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### 5.7 Go-live checklist
- [ ] Strong random `JWT_SECRET` and `JWT_REFRESH_SECRET`.
- [ ] Change the seeded default passwords (`Password123`).
- [ ] `CLIENT_URL` set to your real domain (CORS).
- [ ] MongoDB bound to localhost / firewalled (`ufw`), or Atlas IP allow-list set.
- [ ] `pm2 save` done so the app restarts on reboot.
- [ ] Configure SMTP if you want email notifications.

### Updating later
```bash
cd Placeonix_Dashboard && git pull
cd placeonix-hub-backend && npm install --production
pm2 restart placeonix-api
```

---

## 6. Notes
- `vercel.json` and `placeonix-hub-backend/api/index.js` exist from an earlier Vercel
  experiment — **ignore them on a VPS**; use `src/server.js` with PM2 as above.
- Resource "view-only / no download" for students is best-effort (browser-side); true
  download protection needs signed/streamed delivery.
