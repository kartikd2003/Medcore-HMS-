# MedCore HMS — architecture

A multi-tenant hospital management platform. This document covers the
backend (`apps/api`) — the only app currently built. `apps/web` and
`packages/types` are scaffolded in the monorepo layout but have no code yet.

## Stack

| Layer | Choice |
|---|---|
| API framework | NestJS 10 (Express adapter) |
| ORM / migrations | Prisma 5, PostgreSQL 16 |
| Cache / queue | Redis 7 via `ioredis`, jobs via BullMQ (not yet wired to real usage — see Known gaps) |
| Auth | Passport JWT strategies, `bcryptjs` for password hashing (chosen over `bcrypt` — it compiles a native binary that Alpine's musl libc frequently can't use prebuilt, causing silent Docker build failures; `bcryptjs` is pure JS, same API) |
| Realtime | Socket.IO via `@nestjs/websockets` |
| Validation | `class-validator` / `class-transformer`, global `ValidationPipe` |
| Rate limiting | `@nestjs/throttler`, global default + per-route overrides |
| Testing | Jest + Supertest |
| Local infra | Docker Compose (postgres, redis, api) |
| CI | GitHub Actions — lint, test, build, Docker build on every push/PR to `main` |

The API is a single NestJS monolith exposing a REST API under
`/api/v1`, plus one WebSocket namespace (`/realtime`). It is not
currently split into separate services — module boundaries inside
`apps/api/src` are the seam a future service split would follow.

## Request lifecycle

Every HTTP request passes through four global guards, registered in this
order in `app.module.ts` (Nest runs `APP_GUARD` providers in registration
order, so the order here is load-bearing):

1. **`JwtAuthGuard`** — authenticates by default. Verifies the access
   token and populates `req.user`. Routes opt out with `@Public()`
   (registration, login, OTP verification, public slot browsing, health check).
2. **`RolesGuard`** — enforces `@Roles(...)` metadata. A route with no
   `@Roles()` decorator is open to any authenticated user (role
   restriction is opt-in per endpoint, not the default).
3. **`TenantGuard`** — rejects any request whose route param, query
   string, or body carries a `hospitalId` that doesn't match the
   caller's own. `SUPER_ADMIN` is the only exempt role. This is
   defense-in-depth: the primary control is every service method
   scoping its own Prisma queries by `hospitalId`.
4. **`ThrottlerGuard`** — 100 requests/60s by default; `POST /auth/login`
   overrides this to 20/60s at the route level (raised from an initial
   5/60s after the Week 3 smoke test's six sequential role logins tripped it).

Requests that pass all four reach the controller, which delegates to a
service that talks to Prisma (and, where relevant, the realtime gateway).

This exact guard chain is what the RBAC test matrix
(`apps/api/src/test/rbac.spec.ts`) verifies end to end — 389 assertions,
every protected route against all 9 roles, currently all passing.

## Tenancy model

Row-level isolation, not schema- or database-per-tenant — chosen for
this scale (30–800 beds per hospital) for cheaper operations and a
single migration path. Every tenant-scoped table carries a `hospitalId`
column. `SUPER_ADMIN` users have `hospitalId = null` and operate across
every tenant (platform onboarding, cross-hospital administration);
every other role is pinned to the `hospitalId` on their `User` record.
Postgres row-level security is a possible future layer on top of this,
not currently implemented.

## Domain modules

Each is a self-contained NestJS module (`controller` + `service` +
`module`, some with `dto/`) under `apps/api/src/`:

| Module | Responsibility |
|---|---|
| `auth` | Register + OTP verification, login, refresh rotation with reuse detection, logout |
| `users` | Hospital-admin-only staff provisioning and deactivation |
| `hospitals` | Super-admin-only tenant onboarding, activation, suspension |
| `doctors` | Doctor profile, weekly availability templates, derived open slots |
| `appointments` | Booking (patients) and status transitions (patient/doctor/receptionist/admin) |
| `medical-records` | Doctor-authored records tied 1:1 to a completed appointment; never hard-deleted |
| `medicines` | Pharmacy catalog and stock adjustment |
| `prescriptions` | Per-item dispensing against a medical record's prescription |
| `lab-tests` | Lab test catalog |
| `lab-orders` | Order → sample collected → result uploaded → approved/rejected |
| `invoices` | Generation from consultation/lab/pharmacy line items, payment recording |
| `realtime` | Socket.IO gateway, one room per hospital |
| `health` | Liveness endpoint — used by Docker's `HEALTHCHECK` and (eventually) AWS target group health checks |
| `prisma` | Global Prisma client wrapper |

Cross-cutting: `common/guards` (roles, tenant), `common/decorators`
(`@Public()`, `@Roles()`, `@CurrentUser()`).

**Role coverage note**: of the 9 roles in the `Role` enum, `NURSE` currently
has zero `@Roles()`-gated endpoints anywhere in the app — it can only reach
routes open to any authenticated user. This surfaced directly from building
the RBAC test matrix rather than being a deliberate design choice; worth a
decision (build nurse-specific endpoints, or fold nursing tasks into an
existing role) before this ships.

## Data model highlights

Full schema: `apps/api/prisma/schema.prisma` (18 models). Notable
design choices baked into it:

- **`Availability`** is a weekly recurring template (weekday +
  start/end time), not a row per bookable slot — slots are derived at
  read time, avoiding unbounded row growth into the future. Not yet
  cached (Redis wiring is still a TODO — see Known gaps).
- **`LabOrder.resultData`** is a hybrid: a `Json` field for structured
  numeric panels (queryable, chartable) plus an optional
  `resultFileUrl` for scanned reports or imaging, covering both cases
  without two parallel models.
- **`PrescriptionItem`** is modelled as an explicit join table (not a
  plain many-to-many) because it carries per-item dosage, frequency,
  duration, and dispensed timestamp.
- **`RefreshToken`** rows are stored hashed and rotated on every use;
  they also double as a per-user session/device list. Reuse of a
  revoked token revokes every active session for that user.
- **`Notification`** and **`AuditLog`** use polymorphic
  `(entityType, entityId)` pairs rather than a relation per notifiable
  or auditable model, so both stay stable as new entities are added.
  `Notification` is actually wired up (low-stock alerts on dispense).
  **`AuditLog` is modeled but not yet used anywhere** — no service in
  the codebase currently writes to it, despite the model existing for
  exactly this purpose. This is a real gap, not a subtle one: a
  HIPAA-aware audit trail was part of the original intent and isn't
  built yet.
- Clinically or legally significant records (`MedicalRecord`,
  `Patient`, `Medicine`, `LabTest`) use soft deletes (`deletedAt`);
  nothing clinical is ever hard-deleted.

## Realtime

One Socket.IO namespace (`/realtime`), one room per hospital
(`hospital:<id>`). A connecting client calls `join_hospital`;
`WsJwtGuard` verifies the socket's JWT and the gateway derives the
target room from that verified payload — never from client-supplied
input — so a socket cannot join another tenant's room by guessing an
id. `SUPER_ADMIN` sockets don't join a room (mirroring `TenantGuard` on
the REST side). The gateway currently emits one event type,
`appointment_event`, on creation and status changes.

## API reference

Base path: `/api/v1`. `@Public()` routes need no token; all others
need `Authorization: Bearer <accessToken>`. Roles are additive — no
`Roles` column means any authenticated user (further scoped inside the
service layer).

### Auth (`/auth`)

| Method | Path | Access |
|---|---|---|
| POST | `/register` | Public |
| POST | `/verify-otp` | Public |
| POST | `/login` | Public (20 req/min) |
| POST | `/refresh` | Public (requires valid refresh token) |
| POST | `/logout` | Any authenticated |

### Hospitals (`/hospitals`) — SUPER_ADMIN only

| Method | Path |
|---|---|
| POST | `/` — onboard hospital + first admin, atomically |
| GET | `/` — list all |
| GET | `/:id` |
| PATCH | `/:id/activate` |
| PATCH | `/:id/suspend` |

### Users (`/users`) — HOSPITAL_ADMIN only

| Method | Path |
|---|---|
| POST | `/staff` — create staff scoped to caller's own hospital |
| GET | `/hospital/:hospitalId` |
| DELETE | `/:id` — deactivate |

### Doctors (`/doctors`)

| Method | Path | Roles |
|---|---|---|
| GET | `/me` | DOCTOR |
| POST | `/me/availability` | DOCTOR |
| GET | `/:doctorId/availability` | Any authenticated |
| GET | `/:doctorId/slots?date=` | Public |

### Appointments (`/appointments`)

| Method | Path | Roles |
|---|---|---|
| POST | `/` | PATIENT |
| GET | `/mine` | Any authenticated |
| PATCH | `/:id/status` | PATIENT, DOCTOR, RECEPTIONIST, HOSPITAL_ADMIN |

### Medical records (`/medical-records`)

| Method | Path | Roles |
|---|---|---|
| POST | `/` | DOCTOR |
| GET | `/mine` | PATIENT |
| GET | `/:id` | Any authenticated |

### Medicines (`/medicines`)

| Method | Path | Roles |
|---|---|---|
| POST | `/` | PHARMACIST, HOSPITAL_ADMIN |
| GET | `/`, `/:id` | PHARMACIST, HOSPITAL_ADMIN, DOCTOR |
| PATCH | `/:id` | PHARMACIST, HOSPITAL_ADMIN |
| PATCH | `/:id/stock` | PHARMACIST, HOSPITAL_ADMIN |
| DELETE | `/:id` | HOSPITAL_ADMIN |

### Prescriptions (`/prescriptions`)

| Method | Path | Roles |
|---|---|---|
| GET | `/mine` | PATIENT |
| GET | `/pending` | PHARMACIST, HOSPITAL_ADMIN |
| GET | `/:id` | Any authenticated |
| PATCH | `/items/:itemId/dispense` | PHARMACIST, HOSPITAL_ADMIN |

### Lab tests (`/lab-tests`)

| Method | Path | Roles |
|---|---|---|
| POST | `/` | LAB_TECHNICIAN, HOSPITAL_ADMIN |
| GET | `/`, `/:id` | LAB_TECHNICIAN, HOSPITAL_ADMIN, DOCTOR |
| PATCH | `/:id` | LAB_TECHNICIAN, HOSPITAL_ADMIN |
| DELETE | `/:id` | HOSPITAL_ADMIN |

### Lab orders (`/lab-orders`)

| Method | Path | Roles |
|---|---|---|
| GET | `/?status=` | LAB_TECHNICIAN, HOSPITAL_ADMIN |
| GET | `/:id` | Any authenticated |
| PATCH | `/:id/collect` | LAB_TECHNICIAN, HOSPITAL_ADMIN |
| PATCH | `/:id/result` | LAB_TECHNICIAN, HOSPITAL_ADMIN |
| PATCH | `/:id/approve` | LAB_TECHNICIAN, HOSPITAL_ADMIN |
| PATCH | `/:id/reject` | LAB_TECHNICIAN, HOSPITAL_ADMIN |

### Invoices (`/invoices`)

| Method | Path | Roles |
|---|---|---|
| POST | `/generate` | RECEPTIONIST, ACCOUNTANT, HOSPITAL_ADMIN |
| PATCH | `/:id/pay` | RECEPTIONIST, ACCOUNTANT, HOSPITAL_ADMIN |
| GET | `/mine` | PATIENT |
| GET | `/` | RECEPTIONIST, ACCOUNTANT, HOSPITAL_ADMIN |
| GET | `/:id` | Any authenticated |

### Health (`/health`)

| Method | Path | Access |
|---|---|---|
| GET | `/` | Public — round-trips a real DB query (`SELECT 1`), not just process liveness |

## Local infrastructure

`docker-compose.yml` runs three services: `postgres` (16-alpine),
`redis` (7-alpine), and `api` (built from `apps/api/Dockerfile`). Inside
the compose network, the API reaches Postgres/Redis by service name
(`postgres`, `redis`); `.env` uses `localhost` for running the API
outside Docker against containerized dependencies.

The API's `Dockerfile` is a two-stage build:

- **`builder`** — full toolchain (`npm ci`, not `npm install`, for
  reproducible installs from the lockfile), generates the Prisma
  client, compiles TypeScript.
- **`runtime`** — production dependencies only (`npm ci --omit=dev`).
  `prisma` (the CLI) is deliberately a production dependency, not a
  devDependency, because the container's entrypoint runs
  `prisma migrate deploy` on startup — stripping it to a lean image
  would have silently broken that. Runs as the non-root `node` user.
  Exposes a Docker `HEALTHCHECK` against `/api/v1/health`.

Key environment variables (`.env.example`): `DATABASE_URL`, `REDIS_URL`,
`JWT_ACCESS_SECRET` / `JWT_ACCESS_TTL`, `JWT_REFRESH_SECRET` /
`JWT_REFRESH_TTL`, `PORT` (3001), `CORS_ORIGIN`, and
`NEXT_PUBLIC_API_URL` (reserved for the not-yet-built `apps/web`).

## CI

`.github/workflows/ci.yml` runs on every push/PR to `main`: install →
generate Prisma client → lint → test (the RBAC matrix) → build → build the
Docker image. Verified passing on GitHub's own infrastructure, not just
locally.

## Testing

`apps/api/src/test/rbac.spec.ts` runs a declarative matrix — every
protected route against every role in the `Role` enum — asserting each
combination gets the expected allow/deny, rather than hand-writing
per-endpoint role assertions. 389 assertions, currently all passing,
verified both locally and in CI. Three shell scripts
(`scripts/smoke-test.sh`, `week2-smoke-test.sh`, `week3-smoke-test.sh`)
exercise the full HTTP flow for each phase of the build against a
running instance, using `curl` + `jq`.

## Known gaps

- `apps/web` (Next.js) is not scaffolded.
- OTP delivery is stubbed — `auth.service.ts` has `TODO` markers where
  email/Redis cache calls belong.
- `AuditLog` is modeled in the schema but not written anywhere yet —
  see Data model highlights above.
- `NURSE` role has no gated endpoints yet — see Domain modules above.
- No AWS deployment configuration yet (CI itself is done and passing).
