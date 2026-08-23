import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

/**
 * Row-level multi-tenancy guard. Runs after JwtAuthGuard (which
 * populates req.user) and RolesGuard. Checks any :hospitalId route
 * param, query value, or body field against the caller's own tenant.
 *
 * SUPER_ADMIN is exempt — the only role allowed to operate across
 * tenants (platform onboarding, cross-hospital analytics). Every
 * other role is pinned to the hospitalId on their user record; this
 * guard stops them from reading or writing another tenant's data
 * even by guessing an ID that belongs to a record type they're
 * otherwise permitted to touch.
 *
 * This is defense-in-depth on top of the primary control, which is
 * scoping every Prisma query in the service layer by the caller's
 * hospitalId — never trust a client-supplied hospitalId alone.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user || user.role === Role.SUPER_ADMIN) return true;

    const candidateId = req.params?.hospitalId || req.query?.hospitalId || req.body?.hospitalId;

    if (candidateId && candidateId !== user.hospitalId) {
      throw new ForbiddenException('Cross-tenant access is not permitted');
    }

    return true;
  }
}
