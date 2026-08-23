import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateMedicineDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  genericName?: string;

  @IsString()
  @IsOptional()
  form?: string;

  @IsString()
  @IsOptional()
  strength?: string;

  @IsInt()
  @Min(0)
  stockQty: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  reorderLevel?: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsDateString()
  @IsOptional()
  expiryDate?: string;
}
