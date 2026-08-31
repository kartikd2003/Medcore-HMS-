# Pharmacist portal — what's new

Extract directly over `apps\web`, replacing everything — same flat structure as the last two
rounds (this zip's root sits at the same level as `package.json`).

## Files
- `src/lib/pharmacy-api.ts` — typed API methods for the dispense queue and inventory
- `src/app/(app)/pharmacy/page.tsx` — dispense queue, grouped by prescription/patient
- `src/app/(app)/pharmacy/inventory/page.tsx` — medicine stock table with reorder alerts
- `src/lib/role-routing.ts` — pharmacists now land on `/pharmacy` after login (one-line addition)

`nav-config.ts` already had the `/pharmacy` and `/pharmacy/inventory` entries from the shell
build, so no nav changes were needed.

## Important — bigger gap than usual, please read
Every earlier portal (patient, doctor, receptionist) was cross-checked field-by-field against
the real backend controllers/services/DTOs, even in sessions without network access to run a
build. **This round, no backend source was available at all** — only the five frontend zips were
uploaded. That changes the nature of the gap:

- `GET /medicines` is real and confirmed (the doctor portal's prescription builder already uses
  it) — the inventory table's read side is solid.
- Everything else pharmacy-specific is an **assumption modeled on this codebase's existing
  conventions**, not a verified endpoint:
  - The dispense queue reuses `/prescriptions/mine`, assuming it branches per-role the same way
    `/appointments/mine` already does for patient/doctor/receptionist.
  - Marking an item dispensed assumes `PATCH /prescription-items/:id/dispense`.
  - Saving a stock count assumes `PATCH /medicines/:id`.

Both pharmacy pages surface this in-app (amber notice card, same pattern as the patient
invoices "view-only" notice) rather than hiding it. If any of these 404 against the real
backend, that's a backend gap to close — either role-branch the existing endpoints or add
dedicated ones — not something to work around in the frontend.

Also not build-verified this session (no `npm install` network access here either) — static
review only: every import in the new files resolves to an export that already exists elsewhere
in the codebase (`PortalUI`, `StatusBadge`, `format.ts`, `api.ts`, `types.ts`). Please run
`npm run build` and, more importantly this time, confirm the three assumed endpoints against the
actual backend before trusting this the way the earlier portals were confirmed.
