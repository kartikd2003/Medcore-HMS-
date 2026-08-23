import { IsNumber, IsString, Min } from 'class-validator';

export class GenerateInvoiceDto {
  @IsString()
  appointmentId: string;

  /**
   * Not derived automatically — the schema has no per-hospital fee
   * schedule yet (see PRD gap), so the staff member generating the
   * bill enters the consultation charge explicitly. Pharmacy and lab
   * charges ARE derived automatically from dispensed items / approved
   * orders, since those already carry real prices.
   */
  @IsNumber()
  @Min(0)
  consultationFee: number;
}
