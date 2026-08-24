# MedCore HMS — architecture

A multi-tenant hospital management platform. This document covers the
backend (`apps/api`) — the only app currently built. `apps/web` and
`packages/types` are scaffolded in the monorepo layout but have no code yet.

## Stack

| Layer | Choice |
|---|---|
| API framework | NestJS 10 (Express adapter) |
| ORM / migrations | Prisma 5, PostgreSQL 16 |
| Cache / queue | Redis 7 via `ioredis`, jobs via BullMQ |
| Auth | Passport JWT strategies, `bcryptjs` for password hashing |
| Realtime | Socket.IO via `@nestjs/websockets` |
| Validation | `class-validator` / `class-transformer`, global `ValidationPipe` |
| Rate limiting | `@nestjs/throttler`, global default + per-route overrides |
| Testing | Jest + Supertest |
| Local infra | Docker Compose (postgres, redis, api) |

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
   (registration, login, OTP verification, public slot browsing).
2. **`RolesGuard`** — enforces `@Roles(...)` metadata. A route with no
   `@Roles()` decorator is open to any authenticated user (role
   restriction is opt-in per endpoint, not the default).
3. **`TenantGuard`** — rejects any request whose route param, query
   string, or body carries a `hospitalId` that doesn't match the
   caller's own. `SUPER_ADMIN` is the only exempt role. This is
   defense-in-depth: the primary control is every service method
   scoping its own Prisma queries by `hospitalId`.
4. **`ThrottlerGuard`** — 100 requests/60s by default; `POST /auth/login`
   overrides this to 20/60s at the route level.

Requests that pass all four reach the controller, which delegates to a
service that talks to Prisma (and, where relevant, Redis or the
realtime gateway).

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
| `health` | Liveness endpoint |
| `prisma` | Global Prisma client wrapper |

Cross-cutting: `common/guards` (roles, tenant), `common/decorators`
(`@Public()`, `@Roles()`, `@CurrentUser()`).

## Data model highlights

Full schema: `apps/api/prisma/schema.prisma` (18 models). Notable
design choices baked into it:

- **`Availability`** is a weekly recurring template (weekday +
  start/end time), not a row per bookable slot — slots are derived at
  read time and cached briefly in Redis, avoiding unbounded row growth
  into the future.
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
  `AuditLog` is written on every state-changing operation across the
  app — a HIPAA-aware audit trail requirement.
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

## Local infrastructure

`docker-compose.yml` runs three services: `postgres` (16-alpine),
`redis` (7-alpine), and `api` (built from `apps/api/Dockerfile`). Inside
the compose network, the API reaches Postgres/Redis by service name
(`postgres`, `redis`); `.env` uses `localhost` for running the API
outside Docker against containerized dependencies.

Key environment variables (`.env.example`): `DATABASE_URL`, `REDIS_URL`,
`JWT_ACCESS_SECRET` / `JWT_ACCESS_TTL`, `JWT_REFRESH_SECRET` /
`JWT_REFRESH_TTL`, `PORT` (3001), `CORS_ORIGIN`, and
`NEXT_PUBLIC_API_URL` (reserved for the not-yet-built `apps/web`).

## Testing

`apps/api/src/test/rbac.spec.ts` runs a declarative matrix — every
protected route against every role in the `Role` enum — asserting each
combination gets the expected allow/deny, rather than hand-writing
per-endpoint role assertions. Three shell scripts
(`scripts/smoke-test.sh`, `week2-smoke-test.sh`, `week3-smoke-test.sh`)
exercise the full HTTP flow for each phase of the build against a
running instance, using `curl` + `jq`.

## Known gaps

- `apps/web` (Next.js) is not scaffolded.
- OTP delivery is stubbed — `auth.service.ts` has `TODO` markers where
  email/Redis cache calls belong.
- No CI pipeline or deployment configuration yet.