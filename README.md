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
│   ├── placeonix-hub-portal.html   #   HTML shell
│   ├── css/styles.css              #   all styling
│   ├── js/                         #   app logic in ordered modules (core → learning →
│   │                               #   workflows → ui → entities); core.js loads first
│   ├── manifest.json, sw.js        #   PWA (installable; sw.js is network-only)
│   └── assets/                     #   logos + illustration
├── placeonix-hub-backend/          # REST API
│   ├── api/index.js                #   Vercel serverless entrypoint
│   ├── src/
│   │   ├── server.js               #   Local entrypoint (app.listen)
│   │   ├── app.js                  #   Express app + middleware
│   │   ├── config/                 #   constants, db connection
│   │   ├── models/                 #   Mongoose schemas (20)
│   │   ├── controllers/            #   Route handlers (22)
│   │   ├── routes/                 #   API routes, mounted under /api/v1 (24)
│   │   ├── middleware/             #   auth, validation, error handling
│   │   ├── services/               #   email, cron, upload, notifications
│   │   ├── seeders/seed.js         #   Loads demo data
│   │   └── __tests__/              #   Jest API tests
│   └── .env                        #   Secrets (git-ignored) — copy from .env.example
├── docs/                           # Setup guide, feature list, test cases, deploy guide
├── _serve.js                       # Tiny static server for local dev (serves frontend/ on :8080)
├── vercel.json                     # Deploy config (static frontend + serverless API)
├── package.json                    # Root convenience scripts (delegate to backend)
└── README.md
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

## Code map & conventions

The code is organised into clearly-named modules, and **every function carries a
one-line `/** … */` doc comment** explaining what it does and why. Each file also
opens with a header banner describing its responsibility.

**Frontend** — the app is split into five ordered, single-responsibility JS
"namespaces" (plain global functions, loaded in this order so `core` is ready
first):

| Module | Namespace | Responsibility |
|---|---|---|
| `js/core.js` | **Core** | API client, session state, demo-mode fallback, ROLES/nav, auth, page router, formatting helpers |
| `js/learning.js` | **Learning** | dashboards, course catalog & "My Learning", schedules, attendance, assessments list, placements, announcements, mock interviews, alumni, office hours, bulk import |
| `js/workflows.js` | **Workflows** | assignment lifecycle, progress, leaderboard, lead→student conversion, batch enrollment, session management, join-requests, support chat, management-page renders |
| `js/ui.js` | **UI** | toast + modal framework, CSV export, notifications |
| `js/entities.js` | **Entities** | add/edit/view forms for users, leads, batches, courses, sessions, certificates, reviews, payments, settings |

> The portal wires inline `onclick="fn()"` handlers to these **global**
> functions, so they are intentionally not wrapped in module objects. `core.js`
> must load first (it holds shared state and the only load-time code).

**Backend** — standard Express MVC. Each layer's files are named after the
resource they own:

- `models/` — one Mongoose schema per collection (20). Hooks, methods and
  virtuals are commented.
- `controllers/` — request handlers grouped by resource (22); every exported
  handler is documented.
- `routes/` — thin routers mounted under `/api/v1` (see `routes/index.js`); each
  file's header lists its mount path.
- `middleware/` — `auth` (protect/authorize/ownerOrAdmin), `validate`, `errorHandler`.
- `services/` — `email`, `cron`, `upload`, `notification`.

## Docs
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — full stack, folder map, request flow, endpoint reference
- [`docs/SETUP_GUIDE.txt`](docs/SETUP_GUIDE.txt) — detailed setup
- [`docs/FEATURES.md`](docs/FEATURES.md) — full feature list (per role)
- [`docs/TEST_CASES.md`](docs/TEST_CASES.md) — manual test cases
- [`docs/DEPLOY_VERCEL.md`](docs/DEPLOY_VERCEL.md) — deployment guide

## Tech
Frontend: vanilla HTML/CSS/JS (no framework, no build). Backend: Node.js, Express,
MongoDB + Mongoose, JWT auth, Multer, Nodemailer, node-cron, Winston. Tests: Jest +
Supertest. Hosting: Vercel (static + serverless) on MongoDB Atlas.
