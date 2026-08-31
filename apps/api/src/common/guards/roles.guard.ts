import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Enforces @Roles() metadata. Runs after JwtAuthGuard, so
 * request.user is already populated for authenticated routes.
 *
 * Bug fix: this guard used to ignore @Public() entirely, so a public
 * route nested inside a controller with a class-level @Roles() (e.g.
 * HospitalsController, which is @Roles(SUPER_ADMIN) at the class
 * level) would still get blocked — JwtAuthGuard correctly skipped
 * auth, leaving req.user undefined, but this guard then inherited the
 * class-level role requirement and rejected the undefined user. Now
 * checks the same IS_PUBLIC_KEY metadata JwtAuthGuard checks, and
 * passes through immediately for public routes — enforcing a role
 * requirement on a route that explicitly opted out of auth makes no
 * sense regardless of what the surrounding class declares.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }

    return true;
  }
}
