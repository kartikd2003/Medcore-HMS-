import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Every role in the system, tested against every protected route.
 * This is the RBAC test matrix called for in the PRD — a declarative
 * table of (method, path, allowedRoles) is more maintainable than
 * hand-writing 9 × N assertions per endpoint, and it fails loudly the
 * moment a controller's @Roles() list drifts from what this file
 * expects, which is exactly the kind of regression manual testing
 * tends to miss.
 *
 * ALL_ROLES is the full enum. A route's `allowedRoles` is either that
 * literal list, 'ANY_AUTHENTICATED' (no @Roles() decorator — open to
 * any logged-in user, further scoped inside the service layer), or
 * 'PUBLIC' (@Public() — no auth at all).
 */
const ALL_ROLES = Object.values(Role);

type RouteCase = {
  method: 'get' | 'post' | 'patch' | 'delete';
  path: string; // ':id'-style params get replaced with a dummy id at request time
  allowedRoles: Role[] | 'ANY_AUTHENTICATED' | 'PUBLIC';
};

const ROUTES: RouteCase[] = [
  // Hospitals — controller-level @Roles(SUPER_ADMIN), applies to every route in it
  { method: 'post', path: '/hospitals', allowedRoles: [Role.SUPER_ADMIN] },
  { method: 'get', path: '/hospitals', allowedRoles: [Role.SUPER_ADMIN] },
  { method: 'get', path: '/hospitals/:id', allowedRoles: [Role.SUPER_ADMIN] },
  { method: 'patch', path: '/hospitals/:id/activate', allowedRoles: [Role.SUPER_ADMIN] },
  { method: 'patch', path: '/hospitals/:id/suspend', allowedRoles: [Role.SUPER_ADMIN] },

  // Users
  { method: 'post', path: '/users/staff', allowedRoles: [Role.HOSPITAL_ADMIN] },
  { method: 'get', path: '/users/hospital/:hospitalId', allowedRoles: [Role.HOSPITAL_ADMIN] },
  { method: 'delete', path: '/users/:id', allowedRoles: [Role.HOSPITAL_ADMIN] },

  // Doctors
  { method: 'get', path: '/doctors/me', allowedRoles: [Role.DOCTOR] },
  { method: 'post', path: '/doctors/me/availability', allowedRoles: [Role.DOCTOR] },
  { method: 'get', path: '/doctors/:id/availability', allowedRoles: 'ANY_AUTHENTICATED' },
  { method: 'get', path: '/doctors/:id/slots', allowedRoles: 'PUBLIC' },

  // Appointments
  { method: 'post', path: '/appointments', allowedRoles: [Role.PATIENT] },
  { method: 'get', path: '/appointments/mine', allowedRoles: 'ANY_AUTHENTICATED' },
  {
    method: 'patch',
    path: '/appointments/:id/status',
    allowedRoles: [Role.PATIENT, Role.DOCTOR, Role.RECEPTIONIST, Role.HOSPITAL_ADMIN],
  },

  // Medical records
  { method: 'post', path: '/medical-records', allowedRoles: [Role.DOCTOR] },
  { method: 'get', path: '/medical-records/mine', allowedRoles: [Role.PATIENT] },
  { method: 'get', path: '/medical-records/:id', allowedRoles: 'ANY_AUTHENTICATED' },

  // Medicines
  { method: 'post', path: '/medicines', allowedRoles: [Role.PHARMACIST, Role.HOSPITAL_ADMIN] },
  { method: 'get', path: '/medicines', allowedRoles: [Role.PHARMACIST, Role.HOSPITAL_ADMIN, Role.DOCTOR] },
  { method: 'get', path: '/medicines/:id', allowedRoles: [Role.PHARMACIST, Role.HOSPITAL_ADMIN, Role.DOCTOR] },
  { method: 'patch', path: '/medicines/:id', allowedRoles: [Role.PHARMACIST, Role.HOSPITAL_ADMIN] },
  { method: 'patch', path: '/medicines/:id/stock', allowedRoles: [Role.PHARMACIST, Role.HOSPITAL_ADMIN] },
  { method: 'delete', path: '/medicines/:id', allowedRoles: [Role.HOSPITAL_ADMIN] },

  // Lab tests
  { method: 'post', path: '/lab-tests', allowedRoles: [Role.LAB_TECHNICIAN, Role.HOSPITAL_ADMIN] },
  { method: 'get', path: '/lab-tests', allowedRoles: [Role.LAB_TECHNICIAN, Role.HOSPITAL_ADMIN, Role.DOCTOR] },
  { method: 'get', path: '/lab-tests/:id', allowedRoles: [Role.LAB_TECHNICIAN, Role.HOSPITAL_ADMIN, Role.DOCTOR] },
  { method: 'patch', path: '/lab-tests/:id', allowedRoles: [Role.LAB_TECHNICIAN, Role.HOSPITAL_ADMIN] },
  { method: 'delete', path: '/lab-tests/:id', allowedRoles: [Role.HOSPITAL_ADMIN] },

  // Prescriptions
  { method: 'get', path: '/prescriptions/mine', allowedRoles: [Role.PATIENT] },
  { method: 'get', path: '/prescriptions/pending', allowedRoles: [Role.PHARMACIST, Role.HOSPITAL_ADMIN] },
  { method: 'get', path: '/prescriptions/:id', allowedRoles: 'ANY_AUTHENTICATED' },
  { method: 'patch', path: '/prescriptions/items/:id/dispense', allowedRoles: [Role.PHARMACIST, Role.HOSPITAL_ADMIN] },

  // Lab orders
  { method: 'get', path: '/lab-orders', allowedRoles: [Role.LAB_TECHNICIAN, Role.HOSPITAL_ADMIN] },
  { method: 'get', path: '/lab-orders/:id', allowedRoles: 'ANY_AUTHENTICATED' },
  { method: 'patch', path: '/lab-orders/:id/collect', allowedRoles: [Role.LAB_TECHNICIAN, Role.HOSPITAL_ADMIN] },
  { method: 'patch', path: '/lab-orders/:id/result', allowedRoles: [Role.LAB_TECHNICIAN, Role.HOSPITAL_ADMIN] },
  { method: 'patch', path: '/lab-orders/:id/approve', allowedRoles: [Role.LAB_TECHNICIAN, Role.HOSPITAL_ADMIN] },
  { method: 'patch', path: '/lab-orders/:id/reject', allowedRoles: [Role.LAB_TECHNICIAN, Role.HOSPITAL_ADMIN] },

  // Invoices
  { method: 'post', path: '/invoices/generate', allowedRoles: [Role.RECEPTIONIST, Role.ACCOUNTANT, Role.HOSPITAL_ADMIN] },
  { method: 'patch', path: '/invoices/:id/pay', allowedRoles: [Role.RECEPTIONIST, Role.ACCOUNTANT, Role.HOSPITAL_ADMIN] },
  { method: 'get', path: '/invoices/mine', allowedRoles: [Role.PATIENT] },
  { method: 'get', path: '/invoices', allowedRoles: [Role.RECEPTIONIST, Role.ACCOUNTANT, Role.HOSPITAL_ADMIN] },
  { method: 'get', path: '/invoices/:id', allowedRoles: 'ANY_AUTHENTICATED' },

  // Health
  { method: 'get', path: '/health', allowedRoles: 'PUBLIC' },
];

describe('RBAC matrix (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let hospitalId: string;
  const tokens: Partial<Record<Role, string>> = {};

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix('api/v1');
    await app.init();

    prisma = moduleRef.get(PrismaService);

    // Wipe anything from a previous run so this suite is idempotent.
    // Delete order matters here: every FK below is RESTRICT (Prisma's
    // default when onDelete isn't specified), so children have to go
    // before their parents or Postgres blocks the parent delete.
    //   RefreshToken, Doctor, Patient -> User -> (nothing further)
    //   Doctor -> Department -> Hospital
    await prisma.refreshToken.deleteMany({ where: { user: { email: { contains: '@rbac-test.dev' } } } });
    await prisma.doctor.deleteMany({ where: { user: { email: { contains: '@rbac-test.dev' } } } });
    await prisma.patient.deleteMany({ where: { user: { email: { contains: '@rbac-test.dev' } } } });
    await prisma.user.deleteMany({ where: { email: { contains: '@rbac-test.dev' } } });
    await prisma.department.deleteMany({ where: { hospital: { slug: 'rbac-test-hospital' } } });
    await prisma.hospital.deleteMany({ where: { slug: 'rbac-test-hospital' } });

    const hospital = await prisma.hospital.create({
      data: { name: 'RBAC Test Hospital', slug: 'rbac-test-hospital', status: 'ACTIVE' },
    });
    hospitalId = hospital.id;

    const department = await prisma.department.create({
      data: { hospitalId, name: 'RBAC Test Department' },
    });

    const passwordHash = await bcrypt.hash('Password123!', 4); // low cost factor — this only ever runs in tests

    // One user per role. SUPER_ADMIN has no hospitalId (cross-tenant by design).
    for (const role of ALL_ROLES) {
      const user = await prisma.user.create({
        data: {
          email: `${role.toLowerCase()}@rbac-test.dev`,
          passwordHash,
          firstName: 'RBAC',
          lastName: role,
          role,
          hospitalId: role === Role.SUPER_ADMIN ? null : hospitalId,
          isEmailVerified: true,
        },
      });

      if (role === Role.DOCTOR) {
        await prisma.doctor.create({ data: { userId: user.id, departmentId: department.id } });
      }
      if (role === Role.PATIENT) {
        await prisma.patient.create({ data: { userId: user.id } });
      }

      // Real login through the actual HTTP flow — exercises the real
      // auth path rather than hand-signing a token, so a break in
      // login itself would surface here too.
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: 'Password123!' });
      tokens[role] = res.body.accessToken;
    }
  }, 30_000);

  afterAll(async () => {
    // Same RESTRICT-FK ordering as beforeAll: RefreshToken/Doctor/Patient
    // before User, Department before Hospital.
    await prisma.refreshToken.deleteMany({ where: { user: { email: { contains: '@rbac-test.dev' } } } });
    await prisma.doctor.deleteMany({ where: { user: { email: { contains: '@rbac-test.dev' } } } });
    await prisma.patient.deleteMany({ where: { user: { email: { contains: '@rbac-test.dev' } } } });
    await prisma.user.deleteMany({ where: { email: { contains: '@rbac-test.dev' } } });
    await prisma.department.deleteMany({ where: { hospital: { slug: 'rbac-test-hospital' } } });
    await prisma.hospital.deleteMany({ where: { slug: 'rbac-test-hospital' } });
    await app.close();
  });

  const resolvePath = (path: string) =>
    path
      .replace(':hospitalId', hospitalId)
      .replace(':id', 'nonexistent-id-000')
      .replace(':itemId', 'nonexistent-id-000')
      .replace(':doctorId', 'nonexistent-id-000');

  for (const route of ROUTES) {
    describe(`${route.method.toUpperCase()} ${route.path}`, () => {
      if (route.allowedRoles === 'PUBLIC') {
        it('is reachable with no auth token', async () => {
          const res = await request(app.getHttpServer())[route.method](`/api/v1${resolvePath(route.path)}`);
          expect(res.status).not.toBe(401);
          expect(res.status).not.toBe(403);
        });
      } else {
        for (const role of ALL_ROLES) {
          const isAllowed = route.allowedRoles === 'ANY_AUTHENTICATED' || route.allowedRoles.includes(role);

          it(`${isAllowed ? 'allows' : 'blocks'} ${role}`, async () => {
            const req = request(app.getHttpServer());
            const res = await req[route.method as 'get' | 'post' | 'put' | 'delete' | 'patch'](
              `/api/v1${resolvePath(route.path)}`
            )
              .set('Authorization', `Bearer ${tokens[role]}`)
              .send({});

            if (isAllowed) {
              // Not a 200 assertion — a fake id will legitimately 404,
              // an empty body will legitimately 400. What matters here
              // is that RBAC didn't block it: business-logic failures
              // are a different test's job (see the smoke-test scripts).
              expect(res.status).not.toBe(403);
            } else {
              expect(res.status).toBe(403);
            }
          });
        }
      }
    });
  }
});