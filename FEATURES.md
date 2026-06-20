# Placeonix Hub — Feature Report

A role-based Student / Mentor / Admin portal for an IT training & placement institute.

- **Frontend:** single-file vanilla JS + CSS (`placeonix-hub-portal.html`), installable PWA.
- **Backend:** Node.js + Express REST API (`/api/v1`), MongoDB (Mongoose).
- **Live:** https://placeonix-dashboard.vercel.app (MongoDB Atlas).
- **Demo logins** (password `Password123`): `admin@placeonix.in`, `mentor@placeonix.in`, `student@placeonix.in`.

---

## 1. Authentication & Access
| Feature | Notes |
|--------|-------|
| Email + password login | JWT (access + refresh); role decides dashboard |
| Quick demo-login buttons | Admin / Mentor / Student one-tap on login screen |
| Forgot password | Sends reset request (`/auth/forgot-password`) |
| Auto-login | Re-uses stored token on reload (`/auth/me`) |
| Demo-mode fallback | If API/DB is unreachable, app loads with sample data |
| Logout | Clears token, returns to login |
| Role-based routing | Each role sees only its own sidebar + pages |

## 2. Shared UI / Platform
- Collapsible **mobile nav** (hamburger + drawer) and responsive layouts.
- **Notifications** bell → list, mark-all-read; unread badge.
- **Live chat** with support (modal, contextual auto-replies).
- **Toasts**, **modals**, **confirm dialogs**, form validation.
- **PWA**: installable, app icon, offline shell (service worker).
- Premium minimal theme (brand-purple accents, neutral surfaces).

## 3. Admin
| Module | Capabilities |
|--------|--------------|
| Dashboard | KPI cards (students, mentors, placement rate, batches), key metrics, recent students |
| Students | Table (name/email/phone/joined/status), **View**, **+ Add**, **Bulk CSV import**, **Export CSV** |
| Mentors | Directory with specialization + student counts, **+ Add Mentor**, View |
| Batches | Cards (course, mentor, capacity, status), **+ Create**, Manage |
| Courses | Catalog (17 brochure courses), filter pills, **+ Add Course**, Manage/Edit |
| Sessions | List + manage (Start, Complete, Generate/Copy link, Upload recording, Edit, Delete) |
| Placements | Drives table, **+ New Drive**, Edit, Delete, status, package (LPA) |
| Leads (CRM) | Pipeline summary, **+ Add Lead**, **Convert → Student**, Export CSV |
| Payments | Record payment (student → enrollment → amount), Export CSV |
| Certificates | List, **Issue**, **Download PDF**, **Verify** |
| Resources | List, **Upload**, **Edit**, **Delete** |
| Reviews | All reviews, average rating, respond |
| Leaderboard | Student ranking (points, badges) |
| Announcements | **Send / Edit / Delete**, audience targeting (everyone / students / mentors) |
| Reports | KPIs, monthly enrollment chart, course distribution, placement + revenue summaries |
| Settings | Institute profile, notification toggles, security, account |

## 4. Mentor
| Module | Capabilities |
|--------|--------------|
| Dashboard | Quick actions, stats (students, today's sessions, need-recording, pending requests), student progress, alerts |
| My Students | Enrolled students with course/batch/progress |
| Sessions | Schedule + full management: Start, Complete, Generate/Copy meeting link, **Upload recording**, Edit, Delete |
| Online Requests | Approve (share meeting link) / Reject offline students' requests to join online |
| Attendance | Mark attendance per batch/date |
| Assignments | **Create/Edit/Delete**, **View submissions**, **Grade** (score + feedback) |
| Resources | Upload / Edit / Delete |
| Feedback (Reviews) | View student feedback, respond |
| Leaderboard | Student rankings |
| Announcements | View |
| Profile | Edit profile |

## 5. Student
| Module | Capabilities |
|--------|--------------|
| Dashboard | "Up Next" class (Join Live / venue), stats (courses, progress, attendance), my courses, announcements |
| My Courses (My Learning) | **Enrolled only**; per course: **curriculum with mark-complete (progress)**, class schedule with topics |
| — Online batch | **Live Classes** with Join buttons + recordings |
| — Offline batch | **Class Recordings** (in-app player) + **Request to Join Online** |
| Attendance | Personal attendance % + monthly calendar |
| Assignments | See assigned work, **Submit** (link + notes), see **grade + feedback** |
| Sessions | Personal class list |
| Resources | **View-only** (open links, in-app doc/video viewer, no download) |
| Placements | Drives + **Apply**, track applications |
| Certificates | My certificates, **Download PDF**, Verify |
| Fees | Total / paid / due summary + payment history |
| Leaderboard | Personal rank + points + badges |
| Announcements | Institute announcements |
| Profile | Edit profile |
| Support | Live chat, email, call, FAQ |

## 6. Key API endpoints (`/api/v1`)
`auth` (login, me, refresh, logout, forgot/reset password) ·
`users` (list, create, :id, me/stats, me/enrollments, :id/enrollments, leaderboard, me/enrollments/:id/progress) ·
`courses`, `batches`, `sessions` (+start/complete), `assignments` (+submit, +review) ·
`attendance` (mark, me, batch/:id), `placements` (+apply), `announcements`, `notifications` ·
`leads`, `reviews`, `resources`, `payments`, `certificates` (+verify), `join-requests`, `analytics`.

## 7. Known limitations / not yet wired
- **File uploads** are link-based (no S3/Cloudinary) — files don't persist on serverless.
- **Email / WhatsApp / SMS** not sent (no SMTP/provider keys); notifications are in-app.
- **Online fee payment gateway** (Razorpay) not integrated; admin records payments manually.
- **Real-time chat** is simulated (no WebSocket server on serverless).
- Auth token stored in `localStorage` (httpOnly-cookie migration pending).
