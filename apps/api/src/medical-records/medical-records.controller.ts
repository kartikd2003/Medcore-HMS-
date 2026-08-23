import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { MedicalRecordsService } from './medical-records.service';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';

@UseGuards(RolesGuard)
@Controller('medical-records')
export class MedicalRecordsController {
  constructor(private medicalRecordsService: MedicalRecordsService) {}

  @Roles(Role.DOCTOR)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateMedicalRecordDto) {
    return this.medicalRecordsService.create(user, dto);
  }

  @Get('mine')
  @Roles(Role.PATIENT)
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.medicalRecordsService.listForPatient(user);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.medicalRecordsService.findOne(user, id);
  }
}
