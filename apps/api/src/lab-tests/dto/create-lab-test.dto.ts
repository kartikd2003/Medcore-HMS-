import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateLabTestDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  turnaroundHrs?: number;
}
