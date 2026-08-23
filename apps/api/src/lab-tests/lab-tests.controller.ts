import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { LabTestsService } from './lab-tests.service';
import { CreateLabTestDto } from './dto/create-lab-test.dto';
import { UpdateLabTestDto } from './dto/update-lab-test.dto';

@UseGuards(RolesGuard)
@Controller('lab-tests')
export class LabTestsController {
  constructor(private labTestsService: LabTestsService) {}

  @Roles(Role.LAB_TECHNICIAN, Role.HOSPITAL_ADMIN)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLabTestDto) {
    return this.labTestsService.create(user, dto);
  }

  // Doctors need read access to order tests against the catalog.
  @Roles(Role.LAB_TECHNICIAN, Role.HOSPITAL_ADMIN, Role.DOCTOR)
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.labTestsService.findAll(user);
  }

  @Roles(Role.LAB_TECHNICIAN, Role.HOSPITAL_ADMIN, Role.DOCTOR)
  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.labTestsService.findOne(user, id);
  }

  @Roles(Role.LAB_TECHNICIAN, Role.HOSPITAL_ADMIN)
  @Patch(':id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateLabTestDto) {
    return this.labTestsService.update(user, id, dto);
  }

  @Roles(Role.HOSPITAL_ADMIN)
  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.labTestsService.remove(user, id);
  }
}
