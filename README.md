# MedCore HMS

Multi-tenant hospital management platform. Monorepo: `apps/api` (NestJS +
Prisma + PostgreSQL + Redis), `apps/web` (Next.js — not yet scaffolded),
`packages/types` (shared types — not yet scaffolded).

## Status: Weeks 1–4 — backend complete ✅

- **Foundation** — Prisma schema (18 models, row-level tenant isolation via
  `hospitalId`); JWT auth with OTP verification, refresh rotation + reuse
  detection, logout; three-guard RBAC pipeline; hospital onboarding; staff
  provisioning; seed script; Docker Compose; smoke tests.
- **Scheduling & records** — doctor availability templates, slot lookup,
  appointment booking and status transitions, medical records tied to
  completed appointments, a Socket.IO gateway broadcasting appointment
  events per hospital.
- **Pharmacy, lab, billing** — medicine catalog + stock adjustment,
  prescriptions generated from a medical record and dispensed item-by-item,
  lab test catalog, lab orders (order → collect → result → approve/reject),
  invoice generation from consultation/lab/pharmacy line items and payment
  recording.
- **Hardening** — an RBAC test matrix (`src/test/rbac.spec.ts`) asserting
  every route against every role; fixes to FK ordering and error codes
  surfaced by that suite.

Not yet built: `apps/web` frontend, OTP email delivery (stubbed — see the
`TODO` markers in `auth.service.ts`), CI pipeline, deployment config.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for how the pieces fit together and
a full endpoint reference.

## Running locally

```bash
cp .env.example .env          # edit secrets before anything but local dev
docker compose up -d postgres redis
cd apps/api
npm install
npm run prisma:migrate        # creates tables from schema.prisma
npm run seed                  # seeds City General Hospital + one user per role
npm run start:dev             # API on http://localhost:3001/api/v1
```

Then, in another terminal:

```bash
./scripts/smoke-test.sh          # Week 1 flow: auth, onboarding, staff, tenant isolation
./scripts/week2-smoke-test.sh    # Week 2 flow: availability, booking, medical records, realtime
./scripts/week3-smoke-test.sh    # Week 3 flow: prescribe, dispense, lab results, billing
```

All three require `curl` and `jq`.

Seeded accounts (password `Password123!` for all):

| Role | Email |
|---|---|
| Super Admin | `superadmin@medcore.dev` |
| Hospital Admin | `admin@citygeneral.dev` |
| Doctor | `doctor@citygeneral.dev` |
| Patient | `patient@example.dev` |
| Receptionist | `reception@citygeneral.dev` |
| Pharmacist | `pharmacist@citygeneral.dev` |
| Lab Technician | `labtech@citygeneral.dev` |
| Accountant | `accountant@citygeneral.dev` |

## Architecture notes

- **Tenancy**: row-level, not schema- or database-per-tenant. Every
  tenant-scoped table carries `hospitalId`; `TenantGuard` rejects any request
  whose route/query/body `hospitalId` doesn't match the caller's own, and
  `SUPER_ADMIN` is the only role exempt. Service-layer queries must still
  scope by `hospitalId` themselves — the guard is defense-in-depth, not the
  primary control.
- **Guard order matters**: `JwtAuthGuard` (auth-by-default, opt out with
  `@Public()`) → `RolesGuard` (`@Roles()`, opt-in per route) → `TenantGuard`
  (cross-tenant block) → `ThrottlerGuard`, registered globally in that order
  in `app.module.ts`.
- **Refresh tokens** are stored hashed and rotated on every use. Presenting
  an already-revoked token is treated as a theft signal and revokes every
  active session for that user.
- **Staff accounts** are never self-service — only `HOSPITAL_ADMIN` can
  create `DOCTOR`/`NURSE`/etc., and only within their own hospital.
- **Availability** is a weekly recurring template, not persisted per-slot;
  bookable slots are derived at read-time (template minus existing
  appointments) and cached in Redis briefly to avoid recomputing per request.
- **Realtime**: one Socket.IO room per hospital (`hospital:<id>`). A client's
  room membership is resolved from their verified JWT server-side, not from
  client input, so a socket can't join another tenant's room.
- **Medical records are never hard-deleted** — a legal and clinical
  requirement carried through to lab orders and prescriptions attached to
  them.
- **Every write is audited** via `AuditLog`, keyed polymorphically by
  `(entityType, entityId)`.

## Next

CI/CD pipeline, deployment configuration, and the `apps/web` Next.js
frontend.