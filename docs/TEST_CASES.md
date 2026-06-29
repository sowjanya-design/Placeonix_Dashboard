# Placeonix Hub — Test Cases

Manual test cases for the portal. Run against **https://placeonix-dashboard.vercel.app**
or locally (`npm run dev` + `npm run portal`).

**Test accounts** (password `Password123`):
`admin@placeonix.in` · `mentor@placeonix.in` · `student@placeonix.in`

Legend: **Steps → Expected result**. Each case is independent unless noted.

---

## A. Authentication
| ID | Title | Steps | Expected |
|----|-------|-------|----------|
| AUTH-01 | Valid login | Enter admin email + `Password123` → Login | Lands on Admin dashboard; name shows "Avinash Murari" |
| AUTH-02 | Quick demo login | Click "Student" quick-login button | Auto-logs in as student |
| AUTH-03 | Wrong password | Enter valid email + wrong password | Inline error "Invalid credentials"; no login |
| AUTH-04 | Empty fields | Submit empty form | Validation prevents submit |
| AUTH-05 | Auto-login | Login, refresh the page | Stays logged in (no re-login) |
| AUTH-06 | Logout | Click Logout | Returns to login screen; protected pages inaccessible |
| AUTH-07 | Forgot password | Click "Forgot Password?" → enter email → submit | Neutral confirmation toast shown |
| AUTH-08 | Role isolation | Login as student | No Admin/Mentor-only nav items visible |

## B. Platform / UI
| ID | Title | Steps | Expected |
|----|-------|-------|----------|
| UI-01 | Mobile nav | Shrink window <768px → tap hamburger | Sidebar slides in; tapping a nav item closes it |
| UI-02 | Notifications | Click bell icon | Notification list opens; "Mark all read" clears badge |
| UI-03 | Live chat | Support → Live Chat → type a message | Chat thread shows your msg + an auto-reply |
| UI-04 | PWA install | Open live site in Chrome → install icon in address bar | App installs; opens standalone with Placeonix icon |
| UI-05 | Toast feedback | Trigger any create/save | Toast confirmation appears bottom-right |

## C. Admin — Students
| ID | Title | Steps | Expected |
|----|-------|-------|----------|
| ADM-ST-01 | View list | Admin → Students | Table with name/email/phone/joined/status |
| ADM-ST-02 | Add student | + Add Student → fill form → Create | Toast success; student appears after refresh |
| ADM-ST-03 | View detail | Click View on a row | Modal shows real name/email/phone/role/status |
| ADM-ST-04 | Bulk import (paste) | Import → paste `Riya,Sharma,riya@x.com,9000000000` → Import | "Imported 1 student"; row appears |
| ADM-ST-05 | Bulk import (CSV file) | Import → choose a CSV file → Import | Progress shown; count imported |
| ADM-ST-06 | Import template | Import → Download CSV template | `students-template.csv` downloads |
| ADM-ST-07 | Export CSV | Click Export CSV | `students.csv` downloads with rows |
| ADM-ST-08 | Duplicate email | Import a row with an existing email | That row reported as failed; others succeed |

## D. Admin — Courses / Batches / Mentors
| ID | Title | Steps | Expected |
|----|-------|-------|----------|
| ADM-CO-01 | Course catalog | Admin → Courses | 17 courses; category filter pills work |
| ADM-CO-02 | Add course | + Add Course → fill → Create | Toast success; course listed |
| ADM-CO-03 | Manage course | Click Manage | Detail modal with real title/category/modules |
| ADM-BA-01 | Create batch | Batches → + Create Batch → course+mentor+dates | Toast success; batch card appears |
| ADM-BA-02 | Manage batch | Click Manage | Detail modal with real batch data |
| ADM-ME-01 | Add mentor | Mentors → + Add Mentor | Toast success; mentor listed |

## E. Admin — Announcements (send)
| ID | Title | Steps | Expected |
|----|-------|-------|----------|
| ADM-AN-01 | Send announcement | + New Announcement → title/message/audience → Send | Toast; appears at top of list |
| ADM-AN-02 | Audience targeting | Send "Students only" | Students see it; mentors don't |
| ADM-AN-03 | Edit announcement | Edit → change text → Save | Updated text shows |
| ADM-AN-04 | Delete announcement | Delete → confirm | Removed from list |
| ADM-AN-05 | Student cannot send | Login as student → Announcements | No "+ New Announcement" button |

## F. Admin — Placements
| ID | Title | Steps | Expected |
|----|-------|-------|----------|
| ADM-PL-01 | New drive | + New Drive → company/role/package/deadline → Publish | Drive appears with status + LPA shown correctly |
| ADM-PL-02 | Edit drive | Edit → change package → Save | Updated package shows (e.g., "6–10 LPA") |
| ADM-PL-03 | Delete drive | Delete → confirm | Removed |
| ADM-PL-04 | Package display | View any drive | Shows "X–Y LPA" (not 0.0) |

## G. Admin — Leads / Payments / Certificates
| ID | Title | Steps | Expected |
|----|-------|-------|----------|
| ADM-LD-01 | Add lead | Leads → + Add Lead | Lead appears in pipeline |
| ADM-LD-02 | Convert lead | Click Convert → confirm details → Create Student | Lead marked "Student"; student account created |
| ADM-LD-03 | Export leads | Export CSV | `leads.csv` downloads |
| ADM-PA-01 | Record payment | Payments → + Record Payment → student → enrollment → amount | Toast; payment recorded |
| ADM-CE-01 | Issue/verify cert | Certificates → Verify a number | Verification result modal |

## H. Mentor — Sessions & Recordings
| ID | Title | Steps | Expected |
|----|-------|-------|----------|
| MEN-SE-01 | Schedule session | Sessions → + Schedule Session → batch/time | Session appears as "scheduled" |
| MEN-SE-02 | Generate link | On a scheduled session → Generate Link | Meeting link saved; Copy Link appears |
| MEN-SE-03 | Start session | Click Start | Status → "live"; Join enabled |
| MEN-SE-04 | Complete session | On live session → Complete | Status → "completed"; Upload Recording appears |
| MEN-SE-05 | Upload recording | Upload Recording → paste URL → Save | Recording saved; students can watch |
| MEN-SE-06 | Edit/Delete | Edit fields / Delete a session | Changes persist / session removed |

## I. Mentor — Online Join Requests
| ID | Title | Steps | Expected |
|----|-------|-------|----------|
| MEN-RQ-01 | See pending | Mentor → Online Requests | Pending requests listed with reason/date |
| MEN-RQ-02 | Approve | Approve & Share Link → confirm link | Status → approved; link saved |
| MEN-RQ-03 | Reject | Reject → confirm | Status → rejected |

## J. Mentor — Assignments (assign + grade)
| ID | Title | Steps | Expected |
|----|-------|-------|----------|
| MEN-AS-01 | Create assignment | Assessments → + New Assignment → course/batch/due | Created; visible to that batch's students |
| MEN-AS-02 | View submissions | View Submissions | Lists each student's submission + link |
| MEN-AS-03 | Grade | Enter score + feedback → Save | "Grade saved"; student sees score |
| MEN-AS-04 | Edit/Delete | Edit / Delete an assignment | Changes persist / removed |
| MEN-AT-01 | Mark attendance | Attendance → select batch/date → mark → save | Saved; reflected in student attendance |

## K. Student — Learning
| ID | Title | Steps | Expected |
|----|-------|-------|----------|
| STU-MC-01 | Enrolled only | Student → My Courses | Only enrolled courses (not full catalog) |
| STU-MC-02 | Mark module complete | Tick a curriculum module | Progress % increases; persists on refresh |
| STU-MC-03 | Online course | Open online-batch course | "Live Classes" with Join buttons |
| STU-MC-04 | Offline recordings | Open offline-batch course | Recordings play in in-app player |
| STU-MC-05 | Request online | Offline course → Request to Join Online → date/reason | Toast sent; appears in mentor's requests |
| STU-MC-06 | Course complete | Tick all modules | Progress 100%; status completed |

## L. Student — Assignments / Resources / Fees
| ID | Title | Steps | Expected |
|----|-------|-------|----------|
| STU-AS-01 | See assigned | Assessments | Shows assignments for enrolled batches with status |
| STU-AS-02 | Submit work | Submit Work → link + notes → Submit | Status → Submitted; button → Resubmit |
| STU-AS-03 | See grade | After mentor grades, reopen | Shows score + mentor feedback |
| STU-RS-01 | Resource view-only | Resources → View a doc | Opens in viewer; **no download button** |
| STU-RS-02 | Open link resource | Click Open Link | Opens external URL in new tab |
| STU-FE-01 | Fees summary | Fees | Total / paid / due + payment history |
| STU-CE-01 | Certificate PDF | Certificates → Download PDF | Printable certificate opens |

## M. Gamification / Leaderboard
| ID | Title | Steps | Expected |
|----|-------|-------|----------|
| LB-01 | Leaderboard ranking | Open Leaderboard | Students ranked by points (progress×10 + attendance×5) |
| LB-02 | Personal rank | As student | "You're ranked #N" card + badges |
| LB-03 | Updates with progress | Mark modules complete → revisit leaderboard | Points/rank reflect new progress |

## N. Negative / edge cases
| ID | Title | Steps | Expected |
|----|-------|-------|----------|
| NEG-01 | Unauthorized API | Call an admin endpoint with a student token | 403 Forbidden |
| NEG-02 | Submit without enrollment | Student submits to a non-enrolled batch's assignment | 403 (not enrolled) |
| NEG-03 | Required validation | Submit any create form with blanks | "Please fill all required fields" |
| NEG-04 | Backend offline | Stop backend, reload portal | Demo-mode banner; sample data loads |
| NEG-05 | Duplicate review | Same student reviews same mentor twice | Blocked by unique constraint |

---

### Suggested smoke test (5 min, all roles)
1. Login each role via quick-login.
2. Admin: add a student, send an announcement, create a drive.
3. Mentor: create an assignment, schedule a session, upload a recording, approve a join request.
4. Student: mark a module complete, submit the assignment, check leaderboard rank.
5. Verify the graded score appears for the student.
