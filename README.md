# MedCore HMS

Multi-tenant hospital management platform. Monorepo: `apps/api` (NestJS +
Prisma + PostgreSQL) — built and tested. `apps/web` (Next.js) and
`packages/types` are scaffolded in the layout but have no code yet;
frontend work is planned as its own phase after the backend.

See [`Architecture.md`](./Architecture.md) for the full technical writeup —
request lifecycle, tenancy model, data model, and complete API reference.

## Status

**Weeks 1–3 (backend features) and Week 4 (backend ops) are complete.**
Frontend has not been started.

- [x] **Week 1 — Foundation**: Prisma schema (18 models, row-level tenant
      isolation), JWT auth with refresh rotation + reuse detection, RBAC
      (`JwtAuthGuard` → `RolesGuard` → `TenantGuard`), hospital onboarding,
      staff provisioning, seed script, Docker Compose
- [x] **Week 2 — Clinical core**: doctor availability templates + derived
      bookable slots, appointment booking with conflict protection, status
      lifecycle, medical records (auto-completes the appointment), Socket.IO
      real-time gateway with per-hospital rooms
- [x] **Week 3 — Pharmacy, lab, billing**: medicine inventory, lab test
      catalog, prescriptions wired into medical records, pharmacist dispense
      flow with low-stock notifications, lab order lifecycle
      (ordered → collected → result → approved/rejected), invoice generation
      from consultation + pharmacy + lab charges, payment recording
- [x] **Week 4 — Backend ops**: production-hardened multi-stage Dockerfile
      (non-root user, `/health` endpoint + `HEALTHCHECK`, `bcryptjs` instead
      of native-compiling `bcrypt`), GitHub Actions CI (lint → test → build →
      Docker build, verified passing), and an automated RBAC test matrix
      (`apps/api/src/test/rbac.spec.ts`) — 389 assertions covering every
      protected route against all 9 roles, all passing
- [ ] AWS deployment — not yet done
- [ ] `apps/web` frontend — not yet started
- [ ] OTP email delivery — stubbed (`TODO` markers in `auth.service.ts`
      where the Redis cache / email queue calls belong)

## Running locally

```bash
cp apps/api/.env.example apps/api/.env   # edit secrets before anything but local dev
docker compose up -d postgres redis
cd apps/api
npm install
npm run prisma:migrate        # creates tables from schema.prisma
npm run seed                  # seeds City General Hospital + one user per role
npm run start:dev             # API on http://localhost:3001/api/v1
```

Then, in another terminal, any of the three phase smoke tests:

```bash
./scripts/smoke-test.sh          # Week 1: auth, RBAC, tenant isolation
./scripts/week2-smoke-test.sh    # Week 2: booking through to a completed consult
./scripts/week3-smoke-test.sh    # Week 3: prescribe → dispense → lab → invoice → pay
```

Or the automated RBAC matrix:

```bash
cd apps/api && npm test
```

Or the full Docker stack (uses its own empty database, separate from your
native Postgres):

```bash
docker compose up -d
curl http://localhost:3001/api/v1/health
```

## Seeded accounts

Password `Password123!` for all. All except Super Admin belong to **City
General Hospital**.

| Role | Email |
|---|---|
| Super Admin | `superadmin@medcore.dev` |
| Hospital Admin | `admin@citygeneral.dev` |
| Doctor | `doctor@citygeneral.dev` (Mon–Fri 9:00–13:00 availability, 15-min slots) |
| Receptionist | `reception@citygeneral.dev` |
| Pharmacist | `pharmacist@citygeneral.dev` |
| Lab Technician | `labtech@citygeneral.dev` |
| Accountant | `accountant@citygeneral.dev` |
| Patient | `patient@example.dev` |

Seeded catalog: Paracetamol, Amoxicillin (medicines); Complete Blood Count,
Lipid Profile (lab tests).

## CI

Every push/PR to `main` runs lint, the RBAC test suite, a production build,
and a Docker image build — see `.github/workflows/ci.yml`.

## Next

AWS deployment for the API, then the Next.js frontend as its own phase.
