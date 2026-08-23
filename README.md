# MedCore HMS

Multi-tenant hospital management platform. Monorepo: `apps/api` (NestJS +
Prisma + PostgreSQL), `apps/web` (Next.js, not yet scaffolded), `packages/types`
(shared types, not yet scaffolded).

## Status: Week 1 — Foundation ✅

- [x] Prisma schema — 18 models, row-level tenant isolation via `hospitalId`
- [x] JWT auth — register + OTP verification, login, refresh rotation with reuse
      detection, logout
- [x] RBAC — `JwtAuthGuard` (auth-by-default) → `RolesGuard` (`@Roles()`) →
      `TenantGuard` (cross-tenant block), applied globally in that order
- [x] Hospital onboarding — Super Admin creates a hospital + its first admin
      atomically; activate/suspend
- [x] Staff provisioning — Hospital Admin creates staff scoped to their own
      hospital only
- [x] Seed script — one full tenant (super admin, hospital admin, doctor,
      patient) for immediate testing
- [x] Docker Compose — postgres, redis, api
- [x] Smoke-test script covering the full flow, including a tenant-isolation
      check

Not yet built: `apps/web` frontend, OTP email delivery (stubbed —
`auth.service.ts` has `TODO` markers where the email/Redis cache calls go),
availability/appointments/EMR (Week 2), pharmacy/lab/billing (Week 3), CI +
deployment (Week 4).

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
./scripts/smoke-test.sh       # requires curl + jq
```

Seeded accounts (password `Password123!` for all):

| Role | Email |
|---|---|
| Super Admin | `superadmin@medcore.dev` |
| Hospital Admin | `admin@citygeneral.dev` |
| Doctor | `doctor@citygeneral.dev` |
| Patient | `patient@example.dev` |

## Architecture notes

- **Tenancy**: row-level, not schema- or database-per-tenant. Every
  tenant-scoped table carries `hospitalId`; `TenantGuard` rejects any request
  whose route/query/body `hospitalId` doesn't match the caller's own, and
  `SUPER_ADMIN` is the only role exempt. Service-layer queries must still
  scope by `hospitalId` themselves — the guard is defense-in-depth, not the
  primary control.
- **Refresh tokens** are stored hashed and rotated on every use. Presenting an
  already-revoked token is treated as a theft signal and revokes every active
  session for that user.
- **Staff accounts** are never self-service — only `HOSPITAL_ADMIN` can create
  `DOCTOR`/`NURSE`/etc., and only within their own hospital.

## Next: Week 2

Doctor availability templates, appointment booking, medical records tied to
completed appointments, and a Socket.IO gateway for real-time status updates.
