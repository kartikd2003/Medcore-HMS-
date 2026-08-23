import { Type } from 'class-transformer';
import { IsEmail, IsOptional, IsString, ValidateNested } from 'class-validator';

class AddressDto {
  @IsString() line1: string;
  @IsString() @IsOptional() line2?: string;
  @IsString() city: string;
  @IsString() state: string;
  @IsString() postalCode: string;
  @IsString() @IsOptional() country?: string;
}

/**
 * Super Admin onboards a hospital + its first Hospital Admin in one
 * call — a hospital with no admin is a dead tenant nobody can log
 * into, so the PRD's "hospital onboarding" flow creates both atomically.
 */
export class CreateHospitalDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @ValidateNested()
  @Type(() => AddressDto)
  @IsOptional()
  address?: AddressDto;

  @IsEmail()
  adminEmail: string;

  @IsString()
  adminTemporaryPassword: string;

  @IsString()
  adminFirstName: string;

  @IsString()
  adminLastName: string;
}
