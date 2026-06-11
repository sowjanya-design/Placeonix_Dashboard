# Placeonix Backend API

Production-ready REST API for the Placeonix IT Training & Placement Institute.

Built with Node.js, Express, and MongoDB. Full role-based access control for **Admin**, **Mentor**, and **Student**.

---

## Features

- **JWT Authentication** with access + refresh tokens, account lockout, password reset
- **Role-based access control** (Admin / Mentor / Student) — every endpoint scoped correctly
- **Course management** with embedded modules and topics
- **Batch management** capped at 30 students with mentor assignment
- **Enrollment tracking** with progress, fee, and certificate workflows
- **Assignments** with submissions, mentor reviews, scoring
- **Attendance** with bulk-marking and percentage tracking
- **Sessions** scheduling with calendar, mode (online/offline/hybrid), and recordings
- **Placement drives** with applications, multi-round tracking, final offers
- **Announcements** with audience targeting (roles/batches/courses)
- **In-app notifications** with mark-as-read, helpers for common events
- **Reviews** for mentors and courses with aggregate ratings
- **Resources** (study materials) with file uploads and access control
- **Payments** with installment tracking, refunds, invoices
- **Certificates** with public verification by certificate number
- **Analytics dashboard** for admins (enrollments, placements, revenue, etc.)
- **Leads** management for prospective students from the website
- **File uploads** (avatars, documents, submissions, course assets)
- **Email notifications** via Nodemailer (SMTP configurable)
- **Cron jobs** for fee reminders, attendance warnings, session status updates
- **Rate limiting** with stricter limits on auth endpoints
- **Security**: Helmet, CORS, mongo-sanitize, HPP, XSS protection
- **Logging** with Winston (file rotation + console)
- **Docker support** with multi-stage build and healthcheck
- **Test suite** with Jest + Supertest + in-memory MongoDB
- **Postman collection** included for quick API testing

---

## Tech Stack

| Layer       | Technology                                  |
|-------------|---------------------------------------------|
| Runtime     | Node.js 18+                                 |
| Framework   | Express.js 4                                |
| Database    | MongoDB 7 with Mongoose 8                   |
| Auth        | JWT (jsonwebtoken) + bcrypt (12 rounds)     |
| Validation  | express-validator                           |
| Email       | Nodemailer                                  |
| File Upload | Multer with disk storage                    |
| Scheduling  | node-cron                                   |
| Logging     | Winston with daily rotation                 |
| Security    | Helmet, CORS, rate-limit, mongo-sanitize    |
| Testing     | Jest + Supertest + mongodb-memory-server    |

---

## Project Structure

```
placeonix-backend/
├── src/
│   ├── config/          # DB connection, app constants
│   ├── controllers/     # 14 controllers (business logic)
│   ├── middleware/      # auth, error handler, validation
│   ├── models/          # 13 Mongoose models
│   ├── routes/          # 17 route files
│   ├── seeders/         # Initial data seeder
│   ├── services/        # Email, upload, notification, cron
│   ├── utils/           # Logger, ApiResponse, AppError, JWT
│   ├── __tests__/       # Jest integration tests
│   ├── app.js           # Express config
│   └── server.js        # Entry point
├── Dockerfile
├── docker-compose.yml
├── package.json
├── postman-collection.json
└── README.md
```

---

## Quick Start

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy env template
cp .env.example .env

# 3. Edit .env — at minimum set:
#    - MONGO_URI (e.g. mongodb://localhost:27017/placeonix)
#    - JWT_SECRET (32+ chars)
#    - JWT_REFRESH_SECRET (32+ chars, different from above)

# 4. Seed initial data
npm run seed

# 5. Start dev server with auto-reload
npm run dev
```

API available at `http://localhost:5000/api/v1`

### Docker (full stack)

```bash
# Set required env vars in .env, then:
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop
docker-compose down
```

This spins up:
- API on port 5000
- MongoDB on port 27017
- (Optional) Mongo Express UI on port 8081 with `--profile tools`

### Default Login Credentials (after `npm run seed`)

| Role    | Email                  | Password    |
|---------|------------------------|-------------|
| Admin   | admin@placeonix.in     | Password123 |
| Mentor  | mentor@placeonix.in    | Password123 |
| Student | student@placeonix.in   | Password123 |

---

## API Endpoints (17 modules, 100+ endpoints)

### `/api/v1/auth` — Authentication
- `POST /register` — Public student signup
- `POST /login` — Returns access + refresh tokens
- `POST /refresh` — Refresh access token
- `POST /logout` — Clear refresh token
- `GET /me` — Current user
- `PATCH /password` — Change password
- `POST /forgot-password` — Request reset link
- `POST /reset-password/:token` — Reset password

### `/api/v1/users` — User management
- `GET /` — List users (admin) — supports filter, pagination, search
- `POST /` — Create user (admin)
- `GET /:id` — User details
- `PATCH /:id` — Update (owner or admin)
- `DELETE /:id` — Soft delete (admin)
- `PATCH /:id/role` — Change role (admin)
- `GET /me/stats` — Dashboard stats (role-aware)
- `GET /my-students` — Mentor's students

### `/api/v1/courses` — Course catalog
- `GET /` — List (public reads published only)
- `GET /:id` — By ID or slug
- `POST /` — Create (admin)
- `PATCH /:id` — Update (admin)
- `DELETE /:id` — Delete (admin)
- `PATCH /:id/publish` — Toggle publish status
- `POST /:id/modules` — Add module
- `PATCH /:id/modules/:moduleId` — Update module
- `DELETE /:id/modules/:moduleId` — Delete module
- `PATCH /:id/modules/reorder` — Reorder modules
- `POST /:id/modules/:moduleId/topics` — Add topic
- `PATCH /:id/modules/:moduleId/topics/:topicId` — Update topic
- `DELETE /:id/modules/:moduleId/topics/:topicId` — Delete topic

### `/api/v1/batches` — Batches (max 30 students)
- `GET /` — List (mentors see only theirs)
- `GET /:id` — Batch + enrolled students
- `POST /` — Create (admin)
- `PATCH /:id` — Update (admin)
- `DELETE /:id` — Delete (admin, only if empty)
- `POST /:id/enroll` — Enroll student (admin)
- `DELETE /:id/enroll/:studentId` — Unenroll (admin)

### `/api/v1/sessions` — Class scheduling
- `GET /` — List sessions
- `GET /today` — Today's sessions
- `GET /:id` — Session details
- `POST /` — Create (mentor/admin)
- `PATCH /:id` — Update
- `DELETE /:id` — Cancel
- `PATCH /:id/start` — Mark live
- `PATCH /:id/complete` — Complete with notes/recording

### `/api/v1/assignments` — Tasks & submissions
- `GET /` — List (filtered by user's batches)
- `GET /:id` — Details (students see only own submission)
- `POST /` — Create (mentor/admin)
- `PATCH /:id` — Update
- `DELETE /:id` — Delete
- `POST /:id/submit` — Student submission
- `POST /:id/submissions/:submissionId/review` — Review & score

### `/api/v1/attendance` — Attendance tracking
- `POST /mark` — Bulk mark for batch (mentor/admin)
- `GET /me` — My attendance with summary (student)
- `GET /batch/:batchId` — Batch attendance
- `GET /student/:studentId` — Specific student

### `/api/v1/placements` — Placement drives
- `GET /` — List drives
- `GET /my/applications` — Student's applications
- `GET /:id` — Drive details
- `POST /` — Create drive (admin)
- `PATCH /:id` — Update (admin)
- `DELETE /:id` — Delete (admin)
- `POST /:id/apply` — Apply (student)
- `PATCH /:id/applications/:appId` — Update application status

### `/api/v1/announcements` — Notices
- `GET /` — List for current user (audience-scoped)
- `POST /` — Create (mentor/admin)
- `PATCH /:id` — Update
- `DELETE /:id` — Delete (admin)
- `POST /:id/read` — Mark read

### `/api/v1/notifications` — In-app notifications
- `GET /` — List with unread count
- `GET /unread-count` — Badge count only
- `PATCH /read-all` — Mark all read
- `PATCH /:id/read` — Mark one read
- `DELETE /:id` — Delete one
- `DELETE /clear` — Clear all

### `/api/v1/reviews` — Mentor & course reviews
- `GET /` — Public list (filterable)
- `POST /` — Create (student)
- `PATCH /:id` — Update own
- `DELETE /:id` — Delete (owner or admin)
- `POST /:id/helpful` — Mark helpful
- `POST /:id/respond` — Mentor/admin response

### `/api/v1/resources` — Study materials
- `GET /` — List with access control
- `GET /:id` — Resource details (auto-tracks views)
- `POST /` — Upload (mentor/admin) — multipart form
- `PATCH /:id` — Update metadata
- `DELETE /:id` — Delete
- `POST /:id/download` — Track download

### `/api/v1/payments` — Fee management
- `GET /` — List payments
- `GET /:id` — Payment details / invoice
- `GET /me/summary` — Student's fee summary
- `POST /` — Record payment (admin)
- `PATCH /:id` — Update payment
- `POST /:id/refund` — Process refund

### `/api/v1/certificates` — Course completion certificates
- `GET /` — List (admin) / mine (student)
- `GET /me` — My certificates
- `POST /issue` — Issue certificate (admin)
- `POST /:id/revoke` — Revoke (admin)
- `GET /verify/:number` — **Public** verification

### `/api/v1/uploads` — File uploads
- `POST /avatar` — Upload my avatar (auto-replaces old)
- `POST /document` — Upload single document
- `POST /submission` — Upload up to 5 submission files

### `/api/v1/leads` — Website inquiries
- `POST /` — **Public** inquiry submission
- `GET /` — List (admin)
- `GET /:id` — Lead details
- `PATCH /:id` — Update status / assign
- `POST /:id/notes` — Add internal note
- `DELETE /:id` — Delete

### `/api/v1/analytics` — Admin dashboard metrics
- `GET /overview` — Top-line summary stats
- `GET /enrollments/monthly?year=` — Monthly trend
- `GET /courses/distribution` — By course
- `GET /placements` — Placement statistics
- `GET /revenue` — Revenue summary

---

## Authentication Flow

1. **Login** → receive `accessToken` (7d) + `refreshToken` (30d)
2. Tokens are returned in body AND set as `httpOnly` cookies
3. Use access token in subsequent requests:
   ```
   Authorization: Bearer <accessToken>
   ```
4. When access token expires (401), call `POST /auth/refresh` with refresh token
5. On logout, server invalidates refresh token

### Account Security
- Bcrypt (12 rounds) password hashing
- 5 failed logins → 30 minute lockout
- JWT secrets validated at startup
- httpOnly + secure cookies in production

---

## Response Format

All responses follow this structure:

```json
{
  "success": true,
  "message": "Resource created",
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 124, "pages": 7 }
}
```

Error responses include detailed validation errors:

```json
{
  "success": false,
  "status": "fail",
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email format", "value": "abc" }
  ]
}
```

---

## Role-Based Access Matrix

| Resource          | Admin | Mentor               | Student              |
|-------------------|-------|----------------------|----------------------|
| Users             | Full  | Read self/students   | Read self            |
| Courses           | Full  | Read all             | Read published       |
| Batches           | Full  | Read own             | Read enrolled        |
| Sessions          | Full  | Manage own           | View enrolled        |
| Assignments       | Full  | Manage own batch     | Submit + view own    |
| Attendance        | Full  | Mark own batch       | View own             |
| Placements        | Full  | View                 | Apply + view own     |
| Announcements     | Full  | Create + view        | View targeted        |
| Notifications     | Self  | Self                 | Self                 |
| Reviews           | Full  | Respond to own       | Create + edit own    |
| Resources         | Full  | Upload + manage      | View enrolled        |
| Payments          | Full  | None                 | View own + summary   |
| Certificates      | Full  | None                 | View own + verify    |
| Analytics         | Full  | None                 | None                 |

---

## Cron Jobs (auto-running)

| Schedule           | Job                       | Action                                       |
|--------------------|---------------------------|----------------------------------------------|
| Daily 10:00 AM     | Fee reminders             | Notify students with outstanding dues        |
| Daily 6:00 PM      | Assignment reminders      | Notify students with assignments due tomorrow|
| Daily 8:00 PM      | Attendance warnings       | Notify students below 75% attendance         |
| Hourly             | Overdue assignments       | Auto-close past-deadline assignments         |
| Every 5 minutes    | Session status            | Mark sessions live/completed                 |
| Sundays 3:00 AM    | Notification cleanup      | Delete read notifications older than 60 days |

Disable cron with `DISABLE_CRON=true`.

---

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch
```

Tests use **mongodb-memory-server** — no real DB needed. Currently includes:
- `auth.test.js` — registration, login, JWT, validation
- `course.test.js` — CRUD, role-based access, modules

Add more in `src/__tests__/*.test.js`.

---

## Environment Variables

| Variable              | Required | Default             | Description                          |
|-----------------------|----------|---------------------|--------------------------------------|
| `NODE_ENV`            | No       | development         | `development` / `production` / `test`|
| `PORT`                | No       | 5000                | API port                             |
| `MONGO_URI`           | Yes      |                     | MongoDB connection string            |
| `JWT_SECRET`          | Yes      |                     | 32+ chars                            |
| `JWT_EXPIRE`          | No       | 7d                  | Access token TTL                     |
| `JWT_REFRESH_SECRET`  | Yes      |                     | 32+ chars, different from JWT_SECRET |
| `JWT_REFRESH_EXPIRE`  | No       | 30d                 | Refresh token TTL                    |
| `CLIENT_URL`          | No       | *                   | Allowed CORS origins (comma-sep)     |
| `SMTP_HOST`           | No       |                     | If unset, emails are logged          |
| `SMTP_PORT`           | No       | 587                 |                                      |
| `SMTP_USER`           | No       |                     |                                      |
| `SMTP_PASS`           | No       |                     |                                      |
| `EMAIL_FROM`          | No       | Placeonix <no-reply>|                                      |
| `RATE_LIMIT_WINDOW`   | No       | 15                  | Window in minutes                    |
| `RATE_LIMIT_MAX`      | No       | 100                 | Max requests per window              |
| `MAX_FILE_UPLOAD`     | No       | 10                  | Max file size in MB                  |
| `FILE_UPLOAD_PATH`    | No       | ./uploads           |                                      |
| `DISABLE_CRON`        | No       | false               | Disable scheduled jobs               |

---

## Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Generate strong `JWT_SECRET` and `JWT_REFRESH_SECRET` (32+ chars each)
- [ ] Configure MongoDB Atlas with IP whitelist + user with minimal roles
- [ ] Set `CLIENT_URL` to your production frontend domains (comma-sep for multiple)
- [ ] Configure SMTP for transactional emails
- [ ] Set up SSL/HTTPS termination (nginx, Cloudflare, or PaaS)
- [ ] Configure log rotation and monitoring (Winston already rotates)
- [ ] Run `npm audit fix` regularly
- [ ] Set up daily MongoDB backups
- [ ] Configure CDN for `/uploads` static files in high-traffic deployments
- [ ] Tune rate limits for your expected traffic
- [ ] Set up health check monitoring at `/health`

---

## Frontend Integration Example

Replace your dashboard's localStorage with API calls:

```javascript
// Login
const res = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ email, password }),
});
const { data } = await res.json();
localStorage.setItem('token', data.accessToken);

// Authenticated request
const courses = await fetch('/api/v1/courses', {
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
}).then(r => r.json());

// Add a course (admin)
await fetch('/api/v1/courses', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ title, category, description, duration, fee }),
});
```

---

## Postman Collection

Import `postman-collection.json` into Postman for ready-to-go API testing. Includes auto-token-saving on login.

---

## Health Check

```bash
curl http://localhost:5000/health
```

Returns server status, uptime, memory usage, and environment.

---

## License

ISC © Placeonix
