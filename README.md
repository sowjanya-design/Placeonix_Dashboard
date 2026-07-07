# Placeonix Hub

Role-based portal (Admin · Mentor · Student) for **Placeonix** — an IT training &
placement institute. Single-page frontend + Node/Express + MongoDB API.

- **Live app:** https://placeonix-dashboard.vercel.app
- **Repo:** https://github.com/sowjanya-design/Placeonix_Dashboard

## Test logins (live + seeded local)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@placeonix.in` | `Password123` |
| Mentor | `mentor@placeonix.in` | `Password123` |
| Student | `student@placeonix.in` | `Password123` |

> If the live site ever shows a **"Demo Mode"** banner, do a hard refresh
> (`Ctrl/Cmd + Shift + R`) — a service worker may be serving a cached page.

## Project structure

```
placeonix-hub/
├── frontend/                       # The web app (vanilla HTML/CSS/JS, no build step)
│   ├── placeonix-hub-portal.html   #   the dashboard SPA
│   ├── manifest.json, sw.js        #   PWA (installable; sw.js is network-only)
│   └── assets/                     #   logos + illustration
├── placeonix-hub-backend/          # REST API (see tree below)
├── docs/                           # Setup guide, feature list, test cases, deploy guide
├── _serve.js                       # Tiny static server for local dev (serves frontend/ on :8080)
├── vercel.json                     # Deploy config (static frontend + serverless API)
├── package.json                    # Root convenience scripts (delegate to backend)
└── README.md
    ├── api/index.js            # Vercel serverless entrypoint
    ├── src/
    │   ├── server.js           # Local entrypoint (app.listen)
    │   ├── app.js              # Express app
    │   ├── config/             # constants, db connection
    │   ├── models/             # Mongoose schemas
    │   ├── controllers/        # Route handlers
    │   ├── routes/             # API routes (mounted under /api/v1)
    │   ├── middleware/         # auth, validation, error handling
    │   ├── services/           # email, cron, upload, notifications
    │   ├── seeders/seed.js     # Loads demo data
    │   └── __tests__/          # Jest API tests
    └── .env                    # Secrets (git-ignored) — copy from .env.example
```

## Run locally

Prereqs: **Node ≥ 18** and **MongoDB** (local, or a MongoDB Atlas URI).

```bash
# 1) Backend
cd placeonix-hub-backend
npm install
copy .env.example .env          # then set MONGO_URI + JWT secrets
npm run seed                    # load demo data
npm run dev                     # API → http://localhost:5000

# 2) Frontend (new terminal, from repo root)
node _serve.js                  # portal → http://localhost:8080
```

Or from the repo root: `npm run dev` (API), `npm run portal` (frontend), `npm run seed`.

## Docs
- [`docs/SETUP_GUIDE.txt`](docs/SETUP_GUIDE.txt) — detailed setup
- [`docs/FEATURES.md`](docs/FEATURES.md) — full feature list (per role)
- [`docs/TEST_CASES.md`](docs/TEST_CASES.md) — manual test cases
- [`docs/DEPLOY_VERCEL.md`](docs/DEPLOY_VERCEL.md) — deployment guide

## Tech
Frontend: vanilla HTML/CSS/JS (no framework, no build). Backend: Node.js, Express,
MongoDB + Mongoose, JWT auth, Multer, Nodemailer, node-cron, Winston. Tests: Jest +
Supertest. Hosting: Vercel (static + serverless) on MongoDB Atlas.
