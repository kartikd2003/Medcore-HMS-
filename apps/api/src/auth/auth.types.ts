import { Role } from '@prisma/client';

/** Shape of req.user after JwtStrategy.validate — the JWT payload's claims. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  hospitalId: string | null;
}

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: Role;
  hospitalId: string | null;
}
