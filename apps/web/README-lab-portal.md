# Lab technician portal — what's new

Extract directly over `apps\web`, replacing everything — same flat structure as the last few
rounds (this zip's root sits at the same level as `package.json`).

## Files
- `src/lib/lab-api.ts` — typed API methods for the lab order queue and test catalog
- `src/app/(app)/lab/page.tsx` — lab queue: collect sample → upload result → approve/reject,
  with an Active/All filter
- `src/app/(app)/lab/tests/page.tsx` — read-only test catalog table
- `src/lib/role-routing.ts` — lab technicians now land on `/lab` after login (one-line addition)

`nav-config.ts` already had the `/lab` and `/lab/tests` entries from the shell build, so no nav
changes were needed.

## Same gap as the pharmacist portal — no backend source this session
Only the frontend zips were available this round, same as pharmacy. So:

- `GET /lab-tests` is confirmed real (the doctor portal's consult flow already uses it) — the
  test catalog page and the queue's lab-test details are solid.
- The queue itself (`/lab-orders/mine`), sample collection, result upload, and approve/reject
  are all **assumptions** modeled on this codebase's existing patterns (the `/appointments/mine`
  per-role branching, REST-nested mutations) — not verified endpoints. The queue page says so
  plainly in-app.
- Result upload is a simple notes + file-URL form, since there's no confirmed real file-upload
  endpoint to build against — `resultData` is sent as `{ notes: string }` if filled in.

Not build-verified this session either (no npm registry access) — static review only: every
import in the new files resolves to an export that already exists elsewhere in the codebase.
Please confirm the four assumed lab-order endpoints against the real backend before trusting
this the way the earlier portals (patient, doctor, receptionist) were confirmed.

## All 9 role portals now scaffolded
With this, every role in the RBAC matrix has at least a landing page: patient, doctor,
receptionist, pharmacist, and lab technician have full dedicated portals; hospital admin,
super admin, accountant, and nurse still fall through to the generic `/dashboard` placeholder
(nurse has no nav items at all yet — worth a decision on scope before building it).
