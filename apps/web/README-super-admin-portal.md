# Super admin portal — what's new

Extract directly over `apps\web`, replacing everything — same flat structure as prior rounds.
This one includes a full `types.ts`, not just an addition — it adds one new `Hospital` interface
to the file, so replace the whole thing rather than trying to append.

## Files
- `src/lib/types.ts` — adds a `Hospital` interface (id, name, address, phone, isActive, createdAt)
- `src/lib/superadmin-api.ts` — typed API methods for hospital management
- `src/app/(app)/admin/hospitals/page.tsx` — hospital list: add hospital, activate/deactivate
- `src/lib/role-routing.ts` — super admins now land on `/admin/hospitals` after login

`nav-config.ts` already had the `/admin/hospitals` entry from the shell build.

## The most speculative portal yet
Same no-backend-source situation as every portal built this session, but more so here: every
other role built so far (patient, doctor, receptionist, pharmacist, lab tech, accountant,
hospital admin) is scoped to a single hospital, so there was an existing pattern in this
codebase to model against. Super admin is the one role that operates *across* hospitals — there's
no cross-tenant endpoint anywhere else in this app to copy conventions from. So:
- `GET/POST /hospitals` and `PATCH /hospitals/:id/status` are plausible REST guesses, not
  informed extrapolations the way the other assumed endpoints were.
- The `Hospital` shape itself (name/address/phone/isActive) is inferred from what a hospital
  record would plausibly need, not from any schema reference.

The page says this plainly in-app. Treat this one as the first draft of a conversation with the
backend about what super-admin actually needs, not a near-final integration.

Not build-verified (no npm registry access this session) — static review only.

## Status of all 9 roles
Every role now has a dedicated landing page except Nurse, which still has no nav items and no
decided scope — worth a decision before building it: does it get its own portal, or fold into
an existing one (e.g. shared queue view with doctors)?
