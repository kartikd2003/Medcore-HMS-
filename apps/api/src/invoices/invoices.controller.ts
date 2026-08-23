import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { InvoicesService } from './invoices.service';
import { GenerateInvoiceDto } from './dto/generate-invoice.dto';
import { PayInvoiceDto } from './dto/pay-invoice.dto';

@UseGuards(RolesGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Roles(Role.RECEPTIONIST, Role.ACCOUNTANT, Role.HOSPITAL_ADMIN)
  @Post('generate')
  generate(@CurrentUser() user: AuthenticatedUser, @Body() dto: GenerateInvoiceDto) {
    return this.invoicesService.generate(user, dto);
  }

  @Roles(Role.RECEPTIONIST, Role.ACCOUNTANT, Role.HOSPITAL_ADMIN)
  @Patch(':id/pay')
  pay(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: PayInvoiceDto) {
    return this.invoicesService.pay(user, id, dto);
  }

  @Roles(Role.PATIENT)
  @Get('mine')
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.invoicesService.listMine(user);
  }

  @Roles(Role.RECEPTIONIST, Role.ACCOUNTANT, Role.HOSPITAL_ADMIN)
  @Get()
  listForHospital(@CurrentUser() user: AuthenticatedUser) {
    return this.invoicesService.listForHospital(user);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.invoicesService.findOne(user, id);
  }
}
