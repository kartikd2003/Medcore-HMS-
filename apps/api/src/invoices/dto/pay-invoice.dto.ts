import { IsOptional, IsString } from 'class-validator';

export class PayInvoiceDto {
  @IsString()
  @IsOptional()
  paymentGatewayRef?: string;
}
