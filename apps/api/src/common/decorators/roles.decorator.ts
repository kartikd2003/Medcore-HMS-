import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restricts an endpoint to the given roles. Must be paired with
 * RolesGuard (applied globally in app.module.ts). Usage:
 *
 *   @Roles(Role.DOCTOR, Role.NURSE)
 *   @Get('patients/:id/vitals')
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
