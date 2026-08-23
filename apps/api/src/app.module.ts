import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TenantGuard } from './common/guards/tenant.guard';
import { UsersModule } from './users/users.module';
import { HospitalsModule } from './hospitals/hospitals.module';
import { RealtimeModule } from './realtime/realtime.module';
import { DoctorsModule } from './doctors/doctors.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { MedicalRecordsModule } from './medical-records/medical-records.module';
import { MedicinesModule } from './medicines/medicines.module';
import { LabTestsModule } from './lab-tests/lab-tests.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { LabOrdersModule } from './lab-orders/lab-orders.module';
import { InvoicesModule } from './invoices/invoices.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Global default; auth endpoints (login) set a tighter per-route limit via @Throttle().
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 100 }] }),
    PrismaModule,
    AuthModule,
    UsersModule,
    HospitalsModule,
    RealtimeModule,
    DoctorsModule,
    AppointmentsModule,
    MedicalRecordsModule,
    MedicinesModule,
    LabTestsModule,
    PrescriptionsModule,
    LabOrdersModule,
    InvoicesModule,
    HealthModule,
  ],
  providers: [
    // Nest runs APP_GUARD providers in registration order, so this is
    // load-bearing: JwtAuthGuard populates req.user first, RolesGuard
    // checks @Roles() next, then TenantGuard (which reads both
    // req.user and the resolved route) runs last.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
