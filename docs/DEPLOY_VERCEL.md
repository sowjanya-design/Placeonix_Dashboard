# Deploying Placeonix to Vercel

This repo deploys as **one Vercel project**: the dashboard is served as static
HTML, and the Express API runs as a serverless function under `/api`.

## 1. Create a MongoDB Atlas database (free tier)

1. Go to https://www.mongodb.com/cloud/atlas → create a free M0 cluster.
2. Database Access → add a user (username + password).
3. Network Access → allow `0.0.0.0/0` (so Vercel can connect).
4. Copy the connection string, e.g.
   `mongodb+srv://USER:PASS@cluster0.xxxx.mongodb.net/placeonix-hub`

## 2. Import the repo into Vercel

1. Go to https://vercel.com/new and import
   `github.com/sowjanya-design/Placeonix_Dashboard`.
2. **Root Directory:** leave as the repo root (`.`) — the root `vercel.json`
   handles both the frontend and the API.
3. Framework Preset: **Other** (no build step needed).

## 3. Set Environment Variables (Project → Settings → Environment Variables)

| Key | Value |
|-----|-------|
| `MONGO_URI` | your Atlas connection string |
| `JWT_SECRET` | any 32+ char random string |
| `JWT_REFRESH_SECRET` | a different 32+ char random string |
| `NODE_ENV` | `production` |
| `CLIENT_URL` | `*` |
| `DISABLE_CRON` | `true` |

(Optional: `JWT_EXPIRE=7d`, `JWT_REFRESH_EXPIRE=30d`, `API_VERSION=v1`.)

## 4. Deploy

Click **Deploy**. When it finishes you'll get a URL like
`https://placeonix-dashboard.vercel.app`.

- `/`            → the dashboard portal
- `/api/v1`      → the API (same origin, so no CORS issues)
- `/health`      → health check
- `/website`     → the marketing site

## 5. Seed the database (one time)

The database starts empty. From your machine, point the seeder at Atlas:

```bash
cd placeonix-hub-backend
# PowerShell:
$env:MONGO_URI="<your atlas uri>"; npm run seed
# bash:
MONGO_URI="<your atlas uri>" npm run seed
```

Then log in at the deployed URL with:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@placeonix.in | Password123 |
| Mentor | mentor@placeonix.in | Password123 |
| Student | student@placeonix.in | Password123 |

## Notes

- If `MONGO_URI` is unset/unreachable the API returns a clear 500, and the
  portal automatically falls back to **demo mode** (sample data) so the UI still
  works for previews.
- File uploads to local disk are not persisted on serverless; use a storage
  provider (S3/Cloudinary) if you need uploads in production.
- Cron jobs do not run on serverless (that's why `DISABLE_CRON=true`).
