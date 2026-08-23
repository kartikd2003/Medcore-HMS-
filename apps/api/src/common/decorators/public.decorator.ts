import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks an endpoint as not requiring authentication. Needed because
 * JwtAuthGuard is registered globally (auth-by-default) — public
 * routes like /auth/login must opt out explicitly rather than every
 * protected route opting in.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
