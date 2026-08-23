import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class BookAppointmentDto {
  @IsString()
  doctorId: string;

  @IsISO8601()
  scheduledAt: string; // must exactly match a slot returned by GET /doctors/:id/slots

  @IsString()
  @IsOptional()
  reason?: string;
}
