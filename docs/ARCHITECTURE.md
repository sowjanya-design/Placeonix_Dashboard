# Placeonix Hub — Architecture

A role-based (Admin / Mentor / Student) training-and-placement portal.
Vanilla frontend · Node/Express API · MongoDB. Deployed on Vercel + Atlas.

- **Live:** https://placeonix-dashboard.vercel.app
- **API base (prod):** `https://placeonix-dashboard.vercel.app/api/v1`
- **API base (local):** `http://localhost:5000/api/v1`

## Test logins (seeded)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@placeonix.in` | `Password123` |
| Mentor | `mentor@placeonix.in` | `Password123` |
| Student | `student@placeonix.in` | `Password123` |

## Stack

### Frontend
| Item | Technology |
|---|---|
| Language | Vanilla HTML + CSS + JavaScript (no framework, no build) |
| Entry | `frontend/placeonix-hub-portal.html` (single-file SPA) |
| API calls | Browser `fetch()` → `/api/v1` |
| PWA | `manifest.json` + `sw.js` (network-only, installable) |
| Local server | `_serve.js` (serves `frontend/` on :8080) |

### Backend
| Item | Technology |
|---|---|
| Runtime | Node.js (≥ 18) |
| Framework | Express |
| DB / ODM | MongoDB + Mongoose |
| Auth | JWT (access + refresh) + bcryptjs |
| Validation | express-validator |
| Security | helmet, cors, express-rate-limit, express-mongo-sanitize, hpp, xss-clean, cookie-parser |
| Uploads | Multer (disk / /tmp on serverless) |
| Email | Nodemailer (needs SMTP keys) |
| Jobs | node-cron |
| Logging | Winston + morgan |
| Tests | Jest + Supertest |

### Database
MongoDB (Atlas) via Mongoose — **20 collections**: User, Course, Batch, Enrollment,
Session, Attendance, Assignment, Announcement, PlacementDrive, Notification, Lead,
Review, Resource, Payment, Certificate, JoinRequest, Company, MockInterview, Alumni,
OfficeHourSlot.

## Folder structure

```
placeonix-hub/
├── frontend/
│   ├── placeonix-hub-portal.html   # dashboard SPA
│   ├── manifest.json, sw.js        # PWA
│   └── assets/                     # logos, illustration
├── placeonix-hub-backend/
│   ├── api/index.js                # Vercel serverless entry
│   └── src/
│       ├── server.js               # local entry (app.listen)
│       ├── app.js                  # Express app + middleware
│       ├── config/                 # constants, db
│       ├── models/                 # 20 Mongoose schemas
│       ├── controllers/            # request handlers
│       ├── routes/                 # mounted under /api/v1
│       ├── middleware/             # auth, validate, errors
│       ├── services/               # email, cron, upload, notifications
│       ├── seeders/seed.js         # demo data
│       └── __tests__/              # Jest tests
├── docs/
├── _serve.js, vercel.json, package.json, README.md
```

## Request flow

```
Browser (portal)  ──fetch()──►  /api/v1/*
                                   │
                         Vercel serverless (api/index.js)
                                   │
                           Express app (app.js)
                     protect → authorize → validate → controller
                                   │
                             Mongoose models
                                   │
                             MongoDB Atlas
```

## Auth
- `POST /auth/login` → returns `{ accessToken, user }`. Send it as
  `Authorization: Bearer <token>` on protected routes.
- Roles: `admin`, `mentor`, `student`. Route access is enforced by
  `protect` (valid token) + `authorize(...roles)` middleware.

## API endpoints (grouped, prefix `/api/v1`)

| Group | Key endpoints |
|---|---|
| **auth** | `POST /auth/login`, `POST /auth/register`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/forgot-password` |
| **users** | `GET /users` (admin), `POST /users`, `GET/PATCH/DELETE /users/:id`, `PATCH /users/:id/role`, `GET /users/me/stats`, `GET /users/me/enrollments`, `PATCH /users/me/enrollments/:id/progress`, `GET /users/:id/enrollments`, `GET /users/my-students`, `GET /users/leaderboard` |
| **courses** | `GET /courses`, `GET /courses/:id`, `POST/PATCH/DELETE /courses/:id` (admin) |
| **batches** | `GET /batches`, `GET /batches/:id`, `POST/PATCH/DELETE` (admin), `POST /batches/:id/enroll` |
| **sessions** | `GET /sessions`, `GET /sessions/today`, `GET /sessions/:id`, `POST/PATCH/DELETE`, `PATCH /:id/start`, `PATCH /:id/complete` |
| **assignments** | `GET /assignments`, `GET /:id`, `POST/PATCH/DELETE`, `POST /:id/submit` (student), `POST /:id/submissions/:sid/review` (mentor) |
| **attendance** | `POST /attendance/mark`, `GET /attendance/me`, `GET /attendance/batch/:id`, `GET /attendance/student/:id` |
| **placements** | `GET /placements`, `GET /:id`, `POST/PATCH/DELETE`, `POST /:id/apply`, `GET /placements/my/applications` |
| **announcements** | `GET`, `POST`, `PATCH /:id`, `DELETE /:id`, `POST /:id/read` |
| **notifications** | `GET`, `GET /unread-count`, `PATCH /read-all`, `PATCH /:id/read`, `DELETE /:id`, `DELETE /clear` |
| **leads** | `POST` (public), `GET`, `GET /:id`, `PATCH /:id`, `POST /:id/notes`, `DELETE /:id` |
| **reviews** | `GET`, `POST` (student), `PATCH /:id`, `DELETE /:id`, `POST /:id/helpful`, `POST /:id/respond` |
| **resources** | `GET`, `GET /:id`, `POST /:id/download`, `POST` (mentor/admin), `PATCH/DELETE /:id` |
| **join-requests** | `GET`, `POST` (student), `PATCH /:id` (mentor/admin) |
| **payments** | `GET`, `GET /:id`, `GET /me/summary` (student), `POST` (admin), `PATCH /:id`, `POST /:id/refund` |
| **certificates** | `GET /verify/:number` (public), `GET /me` (student), `GET`, `POST /issue`, `POST /:id/revoke` |
| **analytics** | `GET /overview`, `GET /enrollments/monthly`, `GET /courses/distribution`, `GET /placements`, `GET /revenue` (admin) |
| **search** | `GET /search?q=` |
| **companies** | `GET`, `POST`, `PATCH /:id`, `DELETE /:id` |
| **mock-interviews** | `GET`, `POST`, `PATCH /:id`, `DELETE /:id` |
| **alumni** | `GET`, `POST`, `PATCH /:id`, `DELETE /:id` |
| **office-hours** | `GET`, `POST`, `POST /:id/book`, `POST /:id/cancel`, `DELETE /:id` |
| **uploads** | `POST` (multipart file upload) |

A ready-to-import **Postman collection** is at
`docs/placeonix-api.postman_collection.json` (base URL + token variables, with a
Login request that auto-captures the token).

## Deployment
- **Vercel** serves `frontend/` statically and runs the API as serverless
  functions under `/api` (config in root `vercel.json`).
- **MongoDB Atlas** via `MONGO_URI` env var. Required Vercel env:
  `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `NODE_ENV=production`, `CLIENT_URL`.
- GitHub `main` push → auto-deploy.

## Run locally
```bash
cd placeonix-hub-backend && npm install
cp .env.example .env          # set MONGO_URI + JWT secrets
npm run seed && npm run dev    # API on :5000
# from repo root, another terminal:
node _serve.js                 # portal on :8080
```
