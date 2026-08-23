import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrescriptionsService } from './prescriptions.service';

@UseGuards(RolesGuard)
@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private prescriptionsService: PrescriptionsService) {}

  @Roles(Role.PATIENT)
  @Get('mine')
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.prescriptionsService.listMine(user);
  }

  @Roles(Role.PHARMACIST, Role.HOSPITAL_ADMIN)
  @Get('pending')
  listPending(@CurrentUser() user: AuthenticatedUser) {
    return this.prescriptionsService.listPending(user);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.prescriptionsService.findOne(user, id);
  }

  @Roles(Role.PHARMACIST, Role.HOSPITAL_ADMIN)
  @Patch('items/:itemId/dispense')
  dispense(@CurrentUser() user: AuthenticatedUser, @Param('itemId') itemId: string) {
    return this.prescriptionsService.dispense(user, itemId);
  }
}
