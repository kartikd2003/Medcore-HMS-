import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { MedicinesService } from './medicines.service';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';

@UseGuards(RolesGuard)
@Controller('medicines')
export class MedicinesController {
  constructor(private medicinesService: MedicinesService) {}

  @Roles(Role.PHARMACIST, Role.HOSPITAL_ADMIN)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateMedicineDto) {
    return this.medicinesService.create(user, dto);
  }

  // Doctors need read access too, to know what's in stock while prescribing.
  @Roles(Role.PHARMACIST, Role.HOSPITAL_ADMIN, Role.DOCTOR)
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.medicinesService.findAll(user);
  }

  @Roles(Role.PHARMACIST, Role.HOSPITAL_ADMIN, Role.DOCTOR)
  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.medicinesService.findOne(user, id);
  }

  @Roles(Role.PHARMACIST, Role.HOSPITAL_ADMIN)
  @Patch(':id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateMedicineDto) {
    return this.medicinesService.update(user, id, dto);
  }

  @Roles(Role.PHARMACIST, Role.HOSPITAL_ADMIN)
  @Patch(':id/stock')
  adjustStock(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AdjustStockDto) {
    return this.medicinesService.adjustStock(user, id, dto);
  }

  @Roles(Role.HOSPITAL_ADMIN)
  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.medicinesService.remove(user, id);
  }
}
