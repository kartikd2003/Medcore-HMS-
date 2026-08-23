import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';

/**
 * Verifies the access token on every WebSocket message (not just on
 * connect) since Socket.IO connections can outlive a short-lived
 * access token. Client sends the token once via `auth: { token }` in
 * the socket handshake; we re-verify it here per message rather than
 * trusting the handshake forever.
 */
@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient();
    const token = client.handshake.auth?.token as string | undefined;

    if (!token) throw new UnauthorizedException('Missing auth token');

    try {
      const payload = this.jwt.verify(token, { secret: this.config.get('JWT_ACCESS_SECRET') });
      (client as any).user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
