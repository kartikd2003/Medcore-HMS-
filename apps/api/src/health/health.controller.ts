import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Used by Docker's HEALTHCHECK, AWS target group health checks, and
 * anyone manually confirming the API is actually serving traffic —
 * not just that the Node process started. Checks a real DB round
 * trip rather than just returning 200 unconditionally, since a
 * process that's up but can't reach Postgres is not actually healthy.
 */
@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', timestamp: new Date().toISOString() };
    } catch {
      throw new ServiceUnavailableException('Database connection failed');
    }
  }
}
