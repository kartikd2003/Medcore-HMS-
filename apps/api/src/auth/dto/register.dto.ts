import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

/**
 * Self-registration is intentionally restricted to PATIENT.
 * Staff accounts (DOCTOR, NURSE, etc.) are provisioned by a
 * HOSPITAL_ADMIN via the Users module, never self-service — a
 * receptionist can't grant themselves accountant access by signing up.
 */
export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
