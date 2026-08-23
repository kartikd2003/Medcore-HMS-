import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Thin wrapper around PrismaClient so it can be injected like any other
 * Nest provider and its connection lifecycle tracks the app's.
 *
 * Tenant isolation (hospitalId scoping) is enforced in
 * `common/middleware/tenant.middleware.ts`, not here — keep this file
 * to connection management only.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
