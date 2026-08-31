# Hospital admin portal — what's new

Extract directly over `apps\web`, replacing everything — same flat structure as prior rounds.

## Files
- `src/lib/admin-api.ts` — typed API methods for staff management
- `src/app/(app)/admin/staff/page.tsx` — staff table: add account, change role, activate/deactivate
- `src/lib/role-routing.ts` — hospital admins now land on `/admin/staff` after login

`nav-config.ts` already had the `/admin/staff` entry from the shell build.

## Nothing here is confirmed — same gap as pharmacy/lab/accountant
No backend source was available this session. Every endpoint this page calls is an assumption
modeled on this codebase's conventions, not a verified path:
- `GET /users` — assumed hospital-scoped for a hospital admin (consistent with every other
  role's endpoints being hospital-scoped, e.g. receptionist's appointments).
- `POST /users` — assumed to create a staff account directly, no separate invite/verification
  flow (unlike patient self-registration, which does use OTP verification elsewhere in this app).
- `PATCH /users/:id/status` and `PATCH /users/:id/role` — no confirmed real paths.

The page surfaces this with the same amber in-app notice used on the pharmacy/lab/accountant
pages. Whatever the real endpoints turn out to be, expect to revisit this file.

Not build-verified (no npm registry access this session) — static review only: every import in
the new files resolves to an export that already exists in the codebase.

## Status of all 9 roles
Patient, doctor, receptionist, pharmacist, lab technician, accountant, and now hospital admin
have dedicated portals. Super admin still falls through to the generic `/dashboard` placeholder.
Nurse still has no nav items defined — scope was never decided for that role.
