import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Role } from '@prisma/client';
import { HospitalsService } from './hospitals.service';
import { CreateHospitalDto } from './dto/create-hospital.dto';

@UseGuards(RolesGuard)
@Roles(Role.SUPER_ADMIN)
@Controller('hospitals')
export class HospitalsController {
  constructor(private hospitalsService: HospitalsService) {}

  /**
   * Public hospital directory — id/name/slug only, ACTIVE hospitals
   * only. Added so a prospective patient can pick a hospital before
   * browsing its doctors (see DoctorsController's new public listing).
   * Declared before the :id route below so Nest doesn't try to match
   * "directory" as an :id param — route order matters here.
   */
  @Public()
  @Get('directory')
  listPublicDirectory() {
    return this.hospitalsService.listPublic();
  }

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
