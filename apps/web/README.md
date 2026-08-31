# MedCore HMS — frontend

Next.js 15 (App Router) + React 19 + TypeScript + Tailwind.

## Status

**Built so far:** project scaffold, design system (tokens in
`tailwind.config.ts`), typed API client with automatic refresh-token
rotation (`src/lib/api.ts`), full login flow, role-to-route mapping,
and the **patient portal** — appointments (list + cancel), booking,
medical records (list + detail), prescriptions, and invoices (view-only).

**Not yet built:** the other 8 role-specific portals (doctor,
receptionist, pharmacist, lab tech, accountant, hospital admin, super
admin, nurse). Every one of those roles still lands on the generic
placeholder dashboard.

## Running locally

```bash
cp .env.example .env.local   # point NEXT_PUBLIC_API_URL at your API
npm install
npm run dev                  # http://localhost:3000
```

Log in with any of the 8 seeded backend accounts (see the backend
README) — password `Password123!` for all.

## Design system

- **Palette**: cool paper background, ink navy text, muted clinical
  sage as the primary accent, amber/red as the actual status
  vocabulary (pending/critical), not decoration.
- **Type**: IBM Plex Sans (UI) + IBM Plex Mono (data — IDs, timestamps,
  prices) — one coherent type family suited to an app this dense with
  tabular clinical/financial data.
- **Signature element**: `PulseLine` (`src/components/PulseLine.tsx`) —
  a single subtle waveform stroke, used sparingly as a divider or
  loading state.

## Known gaps

- No `GET /auth/me` endpoint on the backend yet, so session restore on
  page reload uses a locally cached copy of the login response rather
  than a fresh server call (see the comment on `getStoredUser` in
  `src/lib/api.ts`). Works, but won't reflect e.g. a deactivated
  account until the next login.
- No middleware-based route protection yet — pages check auth client-side
  in a `useEffect`, which means an unauthenticated flash is possible
  before the redirect fires. Worth revisiting with Next.js middleware.
- No backend endpoint for a patient to browse/search doctors — only
  `GET /doctors/:id/slots` for an already-known doctor. `/patient/book`
  works around this with a manual doctor-ID field, flagged in the UI.
  A real fix is a backend task (e.g. `GET /doctors?department=`).
- No backend endpoint for a patient to pay an invoice — `PATCH
  /invoices/:id/pay` is restricted to receptionist/accountant/hospital
  admin. `/patient/invoices` is view-only and says so in the UI.
- This build was assembled without network access to install
  dependencies in this environment, so — unlike the earlier scaffold
  and shell builds — it has **not** been verified with a real
  `next build`/`tsc` run this round. Every new file was manually
  cross-checked against the live backend's controllers, services, and
  DTOs for field names and shapes, but run `npm run build` yourself
  before trusting this the way the earlier two zips were verified.
