# HEC Paris Deep Tech & AI Concentration — Enrollment App Workflow

> **Live app:** https://hec-enrollment-app.netlify.app

---

## Overview

The app manages enrollment in the **Deep Tech & AI Concentration** for HEC Paris MBA students. It has two roles — **Admin** (program director) and **Student** — and handles:

- Concentration interest collection
- Mandatory + elective course registration
- Exchange conflict detection
- Messaging between students and admin
- Enrollment tracking and CSV export

---

## Cohorts

| Cohort | Label | AI Fundamentals |
|---|---|---|
| J26 16mo | January 2026 · 16 months | Completed (Dec 2026) |
| S26 16mo | September 2026 · 16 months | Feb 2027 run |
| J27 12mo | January 2027 · 12 months | Dec 2027 run |
| J27 16mo | January 2027 · 16 months | Feb 2027 run (exchange-safe) |

---

## Course Catalogue (2026–27 cycle)

| Course | Month | Format | Level | Exchange-safe |
|---|---|---|---|---|
| AI Fundamentals (Feb run) | February 2027 | Intensive | Conceptual | Yes |
| AI Fundamentals (Dec run) | December 2027 | Intensive | Conceptual | No |
| Supply Chain Transformation | February 2027 | Intensive | Applied | Yes |
| Generative AI for Management | March 2027 | Intensive | Applied | Yes |
| Managing AI Responsibly | March 2027 | Intensive | Conceptual | Yes |
| User-centric AI Product Design | October 2027 | Intensive | Applied | No |
| AI for Business Decision Making | October 2027 | Intensive | Technical | No |
| Product Innovation through Design Thinking | December 2027 | Intensive | Applied | No |
| Tech Sprints | Jan–Mar 2028 | Elective | Applied | Yes |
| Data Driven Decision Making | Jan–Mar 2028 | Elective | Applied | Yes |

**Concentration requirement:** Complete AI Fundamentals + any 2 electives (3 courses total).

---

## Student Workflow

### 1. Login

- Student selects their name from the demo login screen
- Each student belongs to a cohort (J26 16mo, S26 16mo, J27 12mo, J27 16mo)
- System loads their profile from localStorage (seeded from mock data on first visit)

---

### 2. Concentration Interest Survey

Students who have not yet responded see a survey screen asking:

> "Are you interested in earning the Deep Tech & AI Concentration?"

| Response | Effect |
|---|---|
| **Yes, I'm interested** | Unlocks the full portal with mandatory course + elective registration |
| **No, not now** | Unlocks the portal in browse-only mode (no mandatory course, can still register for individual courses) |
| *(No response / null)* | Student remains on the survey screen; no courses can be registered |

Students can change their response at any time from within the portal.

---

### 3. Student Portal

Once past the survey, students see a tabbed portal.

#### Tab: My Courses

**If opted in (Yes):**

1. **Required Course** — AI Fundamentals is highlighted as mandatory (the correct run is auto-selected based on cohort and exchange status). Cannot be deregistered once enrolled.
2. **Available Electives** — All eligible courses for the student's cohort that haven't been completed. Students select from this list to reach the 3-course total.
3. **Registration** — Click a course card to register. Registration is locked after the deadline or once enrolled.

**If opted out (No):**

- A banner reminds the student: *"AI Fundamentals is required to earn the concentration if you change your mind."*
- No mandatory course section appears.
- All eligible electives are available to browse and register for individually.
- A "Reconsider" button re-opens the survey.

**Exchange students:**

- Courses marked `exchangeSafe: false` (October and December intensives) are hidden or flagged as unavailable during the exchange period.
- The February and March intensives are exchange-safe and remain available.
- The mandatory AI Fundamentals is automatically assigned to the exchange-safe run (Feb) if available for that cohort.

**Concentration progress bar:**

- Shows completed courses out of 3 required.
- Turns green and shows "✓ Concentration Earned" when 3 courses are completed.

---

#### Tab: Messages

- Students can send messages to the admin (program director).
- Messages appear in a threaded conversation view.
- Unread replies from admin are highlighted.

---

#### Tab: My Details

- Displays student name, cohort, exchange status, and student ID.
- Shows concentration status (earned / in progress / not pursuing).

---

### 4. Concentration States

| State | Condition | Portal behavior |
|---|---|---|
| Not responded | `concentrationOptIn === null` | Survey screen only; no course access |
| Interested | `concentrationOptIn === true` | Full portal with mandatory + electives |
| Not interested | `concentrationOptIn === false` | Portal with electives only; no mandatory lock |
| **Earned** | 3+ courses completed | Badge shown; no further action required |

---

## Admin Workflow

Login as **Admin (Program Director)** from the login screen.

---

### Tab: Overview

High-level dashboard showing:

- Total students enrolled in the program
- Concentration interest breakdown (Interested / Not interested / No response / Earned)
- Unread messages count (excludes J26 16mo — concentration already complete)
- Active flags count (exchange conflicts, deadline risks, changed exchange status)
- Per-cohort enrollment summary
- Upcoming intensive weeks with registration deadlines

---

### Tab: Students

Full student roster with search, filter, and per-student detail.

#### Filters

| Filter | Description |
|---|---|
| Search | Name, email, or student ID |
| Cohort | J26 16mo / S26 16mo / J27 12mo / J27 16mo |
| Concentration | ✓ Obtained / Interested / Not interested / No response |
| Exchange | On exchange / Not on exchange |
| Flags | Any flag / Exchange conflict / Changed exchange / Unread message |

#### Student Table Columns

| Column | Notes |
|---|---|
| Student | Name + cohort badge |
| Student ID | Format: S1XXXXXX |
| Concentration | Interest badge (indigo for ✓ Obtained, green for Yes, grey for No, yellow for No response) |
| Courses | "✓ N completed" (green) + "N registered" (muted) |
| Exchange | Exchange status badge |
| Flags | Warning icons: exchange conflict, changed exchange status, unread message |

#### Student Detail Panel

Click any student row to expand:

- Full profile: cohort, student ID, email, exchange status
- Concentration progress bar
- Registered and completed courses list
- Message thread with the student
- Admin can reply directly from the panel
- Notes visible to admin only

#### Flags System

| Flag | Condition | Shown for |
|---|---|---|
| Exchange conflict | Student is on exchange + registered for non-exchange-safe course | All cohorts except J26 16mo |
| Changed exchange | `exchangeChanged === true` | All cohorts except J26 16mo |
| Unread message | Student sent unread message | All cohorts except J26 16mo |

> **J26 16mo** students have all flags suppressed — they have completed their exchange and their concentration is already earned.

---

### Tab: Course Setup

Manage all courses in the current cycle.

#### Per-course panel shows:

- Course name, tag, professor, dates, format, level, description
- Cap and current enrollment count
- **Eligible cohorts checkboxes** — controls which cohorts see the course in their portal
- **Cohort breakdown** — registered student count per cohort
- **Enrolled students list** — names of all registered students
- **⬇ CSV export** — downloads a CSV file for that specific course

#### CSV Export Format

| Column | Values |
|---|---|
| Student ID | S1XXXXXX |
| Name | Full name |
| Email | HEC email |
| Cohort | e.g. S26 16mo |
| Exchange | Yes / No |
| Status | Registered / Enrolled / Completed |

File is named: `course-name-tag.csv` (e.g. `ai-fundamentals-feb-run.csv`)

---

### Tab: Messages

Unified inbox showing all student conversations.

- Conversations sorted by most recent message
- Unread count badge per conversation
- Click a conversation to open the thread and reply
- Total unread count shown in the tab header (excludes J26 16mo)

---

### Admin Actions Summary

| Action | Where |
|---|---|
| View all students + filter | Students tab |
| See concentration progress | Students tab — Courses column |
| Read and reply to messages | Students tab (detail panel) or Messages tab |
| Add a student manually | Students tab — Add Student button |
| Upload student roster CSV | Students tab — Import button |
| Edit course eligible cohorts | Course Setup tab — checkboxes |
| Export course enrollment | Course Setup tab — ⬇ CSV per course |
| Reset demo data | Reset Demo button (top right) |

---

## Data Persistence

All data is stored in **browser localStorage** — no server required.

| Key | Contents |
|---|---|
| `hec-enrollment-students` | All student records including registrations, messages, opt-in status |
| `hec-enrollment-courses` | Course definitions with updated eligible cohorts |
| `hec-enrollment-hist` | Historical enrollments (J26 16mo prior cycle) |
| `hec-enrollment-settings` | App-wide settings |

**Reset Demo** clears all localStorage keys and reloads from the built-in mock data.

---

## Deployment

- **Frontend:** [Netlify](https://hec-enrollment-app.netlify.app) — auto-builds from `npm run build`, SPA routing via `netlify.toml`
- **Repository:** https://github.com/cyanghec/hec-enrollment-app
- **To redeploy after changes:**
  ```bash
  npm run build && npx netlify-cli deploy --dir=dist --prod --no-build
  ```
