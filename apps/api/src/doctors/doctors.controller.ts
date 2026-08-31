import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { DoctorsService } from './doctors.service';
import { SetAvailabilityDto } from './dto/set-availability.dto';

@UseGuards(RolesGuard)
@Controller('doctors')
export class DoctorsController {
  constructor(private doctorsService: DoctorsService) {}

  /**
   * Public doctor directory, filtered by hospital — added so a
   * prospective patient can find a doctor to book with. Without this,
   * a patient could only interact with a doctor whose id they already
   * happened to know, which made booking impossible for a real user.
   * hospitalId is required (not optional) — listing every doctor
   * across every tenant with no scoping isn't appropriate for a
   * public, unauthenticated endpoint.
   */
  @Public()
  @Get()
  listPublic(@Query('hospitalId') hospitalId: string) {
    return this.doctorsService.listForHospital(hospitalId);
  }

  @Roles(Role.DOCTOR)
  @Get('me')
  getOwnProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.doctorsService.getDoctorProfile(user);
  }

  @Roles(Role.DOCTOR)
  @Post('me/availability')
  setAvailability(@CurrentUser() user: AuthenticatedUser, @Body() dto: SetAvailabilityDto) {
    return this.doctorsService.setAvailability(user, dto);
  }

  @Get(':doctorId/availability')
  getAvailability(@Param('doctorId') doctorId: string) {
    return this.doctorsService.getAvailability(doctorId);
  }

  @Public()
  @Get(':doctorId/slots')
  getAvailableSlots(@Param('doctorId') doctorId: string, @Query('date') date: string) {
    return this.doctorsService.getAvailableSlots(doctorId, date);
  }
}
