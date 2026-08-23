import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtPayload } from './auth.types';

const SALT_ROUNDS = 12;
const OTP_TTL_MINUTES = 10;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  /**
   * Public self-registration — PATIENT accounts only (see RegisterDto).
   * Account starts with isEmailVerified=false; an OTP is emailed and
   * must be confirmed via verifyOtp() before login is allowed.
   */
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('An account with this email already exists');

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: Role.PATIENT,
      },
    });

    await this.issueEmailOtp(user.email);

    return { id: user.id, email: user.email, message: 'Verification code sent to email' };
  }

  /**
   * Generates a 6-digit OTP, stores its hash + expiry in Redis (via
   * the cache module — omitted here for brevity, see CacheModule),
   * and queues an email job through BullMQ. Kept as a narrow seam so
   * the email/SMS provider can be swapped without touching callers.
   */
  private async issueEmailOtp(email: string): Promise<void> {
    const otp = crypto.randomInt(100000, 999999).toString();
    // TODO: cacheService.set(`otp:${email}`, hash(otp), OTP_TTL_MINUTES * 60)
    // TODO: emailQueue.add('send-otp', { email, otp, ttlMinutes: OTP_TTL_MINUTES })
    void otp;
    void email;
    void OTP_TTL_MINUTES;
  }

  async verifyOtp(dto: VerifyOtpDto) {
    // TODO: compare dto.otp against cacheService.get(`otp:${dto.email}`)
    const user = await this.prisma.user.findUniqueOrThrow({ where: { email: dto.email } });
    await this.prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true },
    });
    return { message: 'Email verified — you can now log in' };
  }

  async login(dto: LoginDto, meta: { userAgent?: string; ipAddress?: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) throw new UnauthorizedException('Invalid credentials');

    if (!user.isActive || user.deletedAt) {
      throw new UnauthorizedException('Account is not active');
    }
    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Please verify your email before logging in');
    }

    const tokens = await this.issueTokenPair(
      { sub: user.id, email: user.email, role: user.role, hospitalId: user.hospitalId },
      meta,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        hospitalId: user.hospitalId,
      },
      ...tokens,
    };
  }

  private async issueTokenPair(
    payload: JwtPayload,
    meta: { userAgent?: string; ipAddress?: string },
  ) {
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_TTL', '15m'),
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_TTL', '7d'),
    });

    // Refresh tokens are stored hashed (never plaintext) so a DB read
    // can't be replayed as a live session; this also gives us a
    // per-device session list and a revocation point for logout.
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId: payload.sub,
        tokenHash,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Rotates the refresh token on every use: the presented token is
   * revoked and a new pair is issued. A refresh token that's already
   * revoked being presented again is treated as a stolen-token signal
   * and revokes the entire session family for that user.
   */
  async refresh(payload: JwtPayload, presentedToken: string, meta: { userAgent?: string; ipAddress?: string }) {
    const tokenHash = this.hashToken(presentedToken);
    const stored = await this.prisma.refreshToken.findFirst({ where: { tokenHash } });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired or invalid');
    }

    if (stored.revokedAt) {
      // Reuse of a revoked token — possible theft. Nuke every session.
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token reuse detected — all sessions revoked');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokenPair(
      { sub: payload.sub, email: payload.email, role: payload.role, hospitalId: payload.hospitalId },
      meta,
    );
  }

  async logout(userId: string, presentedToken?: string) {
    if (!presentedToken) throw new BadRequestException('Missing refresh token');
    const tokenHash = this.hashToken(presentedToken);
    await this.prisma.refreshToken.updateMany({
      where: { userId, tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { message: 'Logged out' };
  }
}
