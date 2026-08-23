import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class PrescriptionItemInputDto {
  @IsString()
  medicineId: string;

  @IsString()
  dosage: string; // e.g. "500mg"

  @IsString()
  frequency: string; // e.g. "1-0-1"

  @IsInt()
  @Min(1)
  durationDays: number;

  @IsString()
  @IsOptional()
  instructions?: string;
}

export class CreateMedicalRecordDto {
  @IsString()
  appointmentId: string;

  @IsNumber() @IsOptional() heightCm?: number;
  @IsNumber() @IsOptional() weightKg?: number;
  @IsString() @IsOptional() bloodPressure?: string;
  @IsNumber() @IsOptional() pulseBpm?: number;
  @IsNumber() @IsOptional() temperatureC?: number;

  @IsString() @IsOptional() diagnosis?: string;
  @IsString() @IsOptional() treatmentPlan?: string;
  @IsString() @IsOptional() notes?: string;

  /**
   * Optional — a consult doesn't always need a prescription. When
   * present, creates one Prescription with these items, atomically
   * with the medical record itself.
   */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemInputDto)
  @IsOptional()
  prescriptionItems?: PrescriptionItemInputDto[];

  /**
   * Optional — ids from GET /lab-tests. Each becomes a LabOrder in
   * ORDERED status, atomically with the medical record.
   */
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @IsOptional()
  labTestIds?: string[];
}
