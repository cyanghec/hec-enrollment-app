# Enrollment System Redesign Plan

## Core Workflow

1. **Admin uploads roster** — CSV with `name, email, cohort, onExchange, completedCourses` (prior-year course IDs)
2. **Admin opens enrollment window** per cohort (toggle + optional date range)
3. **Students log in** → see their prior completions locked ✓, choose from remaining eligible courses
4. **Students can add extras** even if concentration already earned (≥3 courses total)
5. **Admin & student message each other** via threaded conversation
6. **Admin can manually add/remove** any course for any student

---

## Changes Required

### 1. `App.jsx`
- Add `enrollmentWindows` state (per-cohort open/close + date range), persisted to localStorage
- Add `updateEnrollmentWindow(cohort, changes)` handler
- Add `addMessageToStudent(studentId, msgObj)` handler (admin → student)
- Update `normalizeStudent` to add `messages: []` default
- Pass `enrollmentWindows` + `updateEnrollmentWindow` to AdminDashboard and StudentPortal

### 2. `eligibility.js`
- **Update `getProgress`** to count `completedCourses + registeredCourses` toward certificate:
  - `priorCount` = completedCourses.length (already done)
  - `totalCount` = priorCount + registeredCourses.length
  - `alreadyEarned` = priorCount >= 3 (needs no more this year)
  - `willEarn` = totalCount >= 3
  - `hasMandatory` = mandatory in either array
- **Add `getAvailableCourses(student, allCourses)`** — eligible courses minus completedCourses and registeredCourses (what student can still add)

### 3. `StudentPortal.jsx`
- **Window check**: if `enrollmentWindows[cohort].open === false`, show "Registration closed" banner; disable all course toggles
- **Prior completions section**: locked green ✓ cards (not removable, not toggleable)
- **Certificate progress**: show `completedCourses.length + registeredCourses.length` / 3
- **If already earned** (`alreadyEarned`): show "Concentration already earned ✓" banner, still allow adding extras
- **Course selection**: only show `getAvailableCourses()` — eligible minus already completed; mandatory shown as required if not yet in completedCourses
- **Messages tab**: replaces `noteToAdmin` textarea with threaded chat UI (student sends, admin replies appear here)

### 4. `AdminDashboard.jsx`
- **Enrollment Window panel** (top of Students tab): per-cohort row with open/close toggle + start/end date fields
- **StudentDetailPanel** updates:
  - Prior completions: locked ✓ (greyed out, not removable)
  - Current registrations: shown with remove button
  - Admin add-course: dropdown of all courses → add to student's registeredCourses
  - Message thread: full conversation, admin reply input at bottom
- **Messages tab**: list students with unread messages; click to open thread
- **RosterUploadPanel**: add `completedCourses` column parsing (quoted comma-separated course IDs)

### 5. Student data (`messages` field)
- `normalizeStudent` adds `messages: []`
- Message object: `{ id, text, from: 'student'|'admin', ts: ISO, read: boolean }`
- `noteToAdmin` kept for backward compat but new messages go into `messages[]`
- `getFlags` updated to check unread student messages in `messages[]` instead of `noteToAdmin`

---

## Enrollment Window Data Shape
```js
// Default: all closed
{
  'J26 16mo': { open: false, startDate: null, endDate: null },
  'S26 16mo': { open: false, startDate: null, endDate: null },
  'J27 12mo': { open: false, startDate: null, endDate: null },
  'J27 16mo': { open: false, startDate: null, endDate: null },
}
```

---

## CSV Roster Format (updated)
```
name, email, cohort, onExchange, completedCourses
"Lucas Petit","lucas.petit@hec.edu","S26 16mo",false,"ai-fund-feb,supply-chain"
"Emma Wilson","emma.wilson@hec.edu","S26 16mo",false,""
```
`completedCourses` is optional; empty = no prior completions.

---

## File Order of Implementation
1. `eligibility.js` (pure logic, no deps)
2. `App.jsx` (state + handlers)
3. `AdminDashboard.jsx` (enrollment window panel + student detail + messaging)
4. `StudentPortal.jsx` (window check + locked completions + messages tab)
