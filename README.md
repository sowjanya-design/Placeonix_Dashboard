# Placeonix Dashboard

Student, Mentor & Admin Portal for Placeonix IT Training Institute.

## Files in this folder

| File | What it is |
|------|-----------|
| placeonix-hub-portal.html  | The main portal (dashboard) — open this in browser |
| placeonix-website.html     | The public marketing website |
| placeonix-hub-backend/     | The Node.js backend API server |
| SETUP_GUIDE.txt            | Step by step setup instructions |

## Quick Start

### Frontend
Open `placeonix-hub-portal.html` directly, or serve it over HTTP:

```
node _serve.js
```
Then open http://localhost:8080

### Backend
```
cd placeonix-hub-backend
npm install
copy .env.example .env
(edit .env with your settings)
npm run seed
npm run dev
```

Server runs at: http://localhost:5000

## Login Credentials (after npm run seed)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@placeonix.in | Password123 |
| Mentor | mentor@placeonix.in | Password123 |
| Student | student@placeonix.in | Password123 |
