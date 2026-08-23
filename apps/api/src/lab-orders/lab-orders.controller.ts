import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { LabOrderStatus, Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { LabOrdersService } from './lab-orders.service';
import { UploadResultDto } from './dto/upload-result.dto';

@UseGuards(RolesGuard)
@Controller('lab-orders')
export class LabOrdersController {
  constructor(private labOrdersService: LabOrdersService) {}

  @Roles(Role.LAB_TECHNICIAN, Role.HOSPITAL_ADMIN)
  @Get()
  listForHospital(@CurrentUser() user: AuthenticatedUser, @Query('status') status?: LabOrderStatus) {
    return this.labOrdersService.listForHospital(user, status);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.labOrdersService.findOne(user, id);
  }

  @Roles(Role.LAB_TECHNICIAN, Role.HOSPITAL_ADMIN)
  @Patch(':id/collect')
  collectSample(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.labOrdersService.collectSample(user, id);
  }

  @Roles(Role.LAB_TECHNICIAN, Role.HOSPITAL_ADMIN)
  @Patch(':id/result')
  uploadResult(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UploadResultDto) {
    return this.labOrdersService.uploadResult(user, id, dto);
  }

  @Roles(Role.LAB_TECHNICIAN, Role.HOSPITAL_ADMIN)
  @Patch(':id/approve')
  approve(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.labOrdersService.approve(user, id);
  }

  @Roles(Role.LAB_TECHNICIAN, Role.HOSPITAL_ADMIN)
  @Patch(':id/reject')
  reject(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.labOrdersService.reject(user, id);
  }
}
