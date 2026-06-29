# Placeonix — Complete Project

A complete IT Training & Placement Institute platform consisting of:

1. **Marketing Website** (`placeonix.html`) — Public landing page
2. **Multi-Role Dashboard** (`placeonix-dashboard.html`) — Admin/Mentor/Student interfaces
3. **Backend API** (`placeonix-backend/`) — Production-ready Node.js + MongoDB API

---

## Quick Start

### 1. Frontend (immediate, no setup)
Open these files directly in your browser:
- `placeonix.html` — Marketing site
- `placeonix-dashboard.html` — Dashboard (login with demo accounts)

### 2. Backend (requires Node.js + MongoDB)

```bash
cd placeonix-backend
npm install
cp .env.example .env
# Edit .env: set MONGO_URI, JWT_SECRET, JWT_REFRESH_SECRET
npm run seed   # creates demo data
npm run dev    # starts dev server on port 5000
```

Then visit `http://localhost:5000` to see the API landing page.

### Demo Login Credentials (after seeding):
| Role    | Email                  | Password    |
|---------|------------------------|-------------|
| Admin   | admin@placeonix.in     | Password123 |
| Mentor  | mentor@placeonix.in    | Password123 |
| Student | student@placeonix.in   | Password123 |

---

## Project Stats

- **2 HTML files** — Website + Dashboard (608KB total)
- **69 backend JS files** — All syntax-verified
- **15 Mongoose models** — User, Course, Batch, Enrollment, Session, Assignment, Attendance, PlacementDrive, Announcement, Notification, Review, Resource, Payment, Certificate, Lead
- **16 controllers** — Full CRUD with role-based access
- **18 route files** — 100+ API endpoints
- **6 cron jobs** — Auto-running scheduled tasks
- **Docker support** — Multi-stage build with healthcheck
- **Jest tests** — Integration tests with in-memory MongoDB
- **Postman collection** — Ready-to-import API tests

See `placeonix-backend/README.md` for full API documentation.
