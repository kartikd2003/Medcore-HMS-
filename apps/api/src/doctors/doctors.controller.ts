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

  // Public so a patient can browse slots before/without logging in;
  // actually booking one still requires auth (see AppointmentsController).
  @Public()
  @Get(':doctorId/slots')
  getAvailableSlots(@Param('doctorId') doctorId: string, @Query('date') date: string) {
    return this.doctorsService.getAvailableSlots(doctorId, date);
  }
}
