# PenguWave — Security Operations Dashboard (Track B: Frontend)

A security-operations dashboard for an analyst working through security events.
Built on the PenguWave starter; this branch turns the bare starter into a usable,
robust, and hardened SOC dashboard.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm run lint
```

**Demo login:** `admin@penguwave.io` / `admin123`
(Other demo accounts: `analyst@penguwave.io` / `analyst123`, and a disabled
`viewer@penguwave.io` / `viewer123` to show that disabled accounts can't sign in.)

## What was built

- **Overview dashboard** — KPI cards for counts per severity (incl. CRITICAL),
  an events-over-time strip, and top affected hosts / top tags. Cards and tags are
  clickable and drive the table filters.
- **Investigable events table** — full-text search, multi-select severity filter,
  tag filter, and sortable columns. Rows open a slide-over **detail drawer** with the
  full event and raw JSON.
- **Export** — exports the *currently filtered* view as **CSV** or **JSON**, with a
  spreadsheet-safe CSV writer (RFC-4180 escaping).
- **Robust empty/loading/error and messy-data handling** (see below).
- **Auth & roles** — a sign-in gate, session persisted across refresh, and an
  **admin-only** Users page. (Demo auth — see security notes.)

## Key design decisions

- **A normalization layer (`src/lib/events.ts`) is the single source of truth.**
  The UI never touches the raw JSON; every record is coerced into a safe
  `NormalizedEvent` (guaranteed strings, nullable IPs, parsed dates, bucketed
  severity). This is why messy records can't crash the UI.
- **`useEvents` hook** isolates data loading and exposes `loading`/`error`, so
  swapping the mock import for a real `GET /api/events` is a one-line change with
  no UI rework.
- **Descriptions render as plain text, not HTML** — the correct, zero-dependency
  fix for the stored-XSS hole (see below). DOMPurify would only be needed if we
  genuinely had to render rich text.
- **Severity is bucketed but the original label is preserved** (`rawSeverity`) so an
  unexpected value is surfaced, never silently reclassified.

## Security & data issues found in the starter (and fixed)

| Issue | Where | Fix |
|------|-------|-----|
| **Stored XSS** — `sanitizeHtml()` was a no-op but used to render event descriptions as HTML; the data even contains `<img src=x onerror=...>` | `utils.ts`, `EventsPage.tsx` | Render descriptions/search as plain text; removed the stub |
| **Leaked secret** — a live `pw_live_sk_...` API key hardcoded in client code | `api.ts` | Removed; secrets belong server-side only |
| **Credentials logged** — `console.log(email, password)` | `api.ts`, `LoginModal.tsx` | Removed |
| **Plaintext passwords rendered** in a table column + in source | `UsersPage.tsx`, `types.ts` | Removed password column and dropped `password` from the client `User` type |
| **No authz** — `/users` open to everyone; role check left as a TODO | `App.tsx`, `UsersPage.tsx` | Admin-only route guard + role-aware nav |
| **Broken CSV** — no escaping of `,`/`"`/newlines | `utils.ts` | RFC-4180-safe writer |
| **CRITICAL severity mishandled** — outside the type union, rendered green, missing from filter | data / `EventsPage.tsx` | Added CRITICAL as the top severity everywhere |
| **Crash on messy data** — unguarded `.toLowerCase()` / `new Date()` on null/empty fields | `EventsPage.tsx` | Null-safe normalization; invalid dates handled |

## How it behaves when data isn't clean

- `null` `sourceIp` / `userId` → shown as `—`, fully searchable/sortable.
- Empty description → shows "(no description provided)".
- `CRITICAL` severity → its own red KPI card, badge, and filter.
- Invalid/missing timestamps → labelled and sorted to the bottom.
- Empty result set → a clear no-results state with a "clear filters" action.

## Notable tradeoff

Authentication here is **client-side demo auth** so the frontend can be shown
end-to-end without the Track A backend. Role gating is a **UX affordance, not a
security boundary** — real authentication (hashed passwords, tokens) and
authorization must be enforced server-side. The API client in `src/api.ts` is
written and ready for that backend.

## Project structure

```
src/
  api.ts                # API client (no secrets; ready for a real backend)
  types.ts              # Severity, SecurityEvent, User (no password)
  lib/events.ts         # normalization + dashboard selectors (pure)
  hooks/useEvents.ts    # data loading w/ loading & error state
  auth/                 # AuthContext + demo mockAuth
  components/           # Overview, EventDetail, SeverityBadge, LoginModal, Navbar
  pages/                # EventsPage, UsersPage, NotFound
```
