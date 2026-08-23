import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

/**
 * Used by HOSPITAL_ADMIN to provision staff accounts (Doctor, Nurse,
 * Receptionist, etc). PATIENT and SUPER_ADMIN are excluded — patients
 * self-register, and Super Admins are seeded/created out-of-band.
 */
export class CreateStaffDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  temporaryPassword: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEnum(Role)
  role: Exclude<Role, 'PATIENT' | 'SUPER_ADMIN'>;
}
