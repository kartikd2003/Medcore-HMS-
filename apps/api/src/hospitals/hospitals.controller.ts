import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { HospitalsService } from './hospitals.service';
import { CreateHospitalDto } from './dto/create-hospital.dto';

@UseGuards(RolesGuard)
@Roles(Role.SUPER_ADMIN)
@Controller('hospitals')
export class HospitalsController {
  constructor(private hospitalsService: HospitalsService) {}

  @Post()
  onboard(@Body() dto: CreateHospitalDto) {
    return this.hospitalsService.onboard(dto);
  }

  @Get()
  listAll() {
    return this.hospitalsService.listAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.hospitalsService.findOne(id);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string) {
    return this.hospitalsService.activate(id);
  }

  @Patch(':id/suspend')
  suspend(@Param('id') id: string) {
    return this.hospitalsService.suspend(id);
  }
}
