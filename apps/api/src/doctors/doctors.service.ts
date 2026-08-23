import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AppointmentStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SetAvailabilityDto } from './dto/set-availability.dto';
import { AuthenticatedUser } from '../auth/auth.types';

@Injectable()
export class DoctorsService {
  constructor(private prisma: PrismaService) {}

  /**
   * A doctor edits their own weekly template as a whole: existing
   * slots are replaced, not merged. Kept transactional so a partial
   * write never leaves a doctor with half their old week and half
   * their new one.
   */
  async setAvailability(user: AuthenticatedUser, dto: SetAvailabilityDto) {
    const doctor = await this.getDoctorForUser(user);

    return this.prisma.$transaction(async (tx) => {
      await tx.availability.deleteMany({ where: { doctorId: doctor.id } });
      await tx.availability.createMany({
        data: dto.slots.map((s) => ({
          doctorId: doctor.id,
          weekday: s.weekday,
          startTime: s.startTime,
          endTime: s.endTime,
          slotMins: s.slotMins,
        })),
      });
      return tx.availability.findMany({ where: { doctorId: doctor.id }, orderBy: { weekday: 'asc' } });
    });
  }

  async getAvailability(doctorId: string) {
    await this.assertDoctorExists(doctorId);
    return this.prisma.availability.findMany({ where: { doctorId }, orderBy: { weekday: 'asc' } });
  }

  /**
   * Derives concrete bookable slots for one calendar date from the
   * weekly template, minus any slot that already overlaps a
   * non-cancelled appointment. Computed on read rather than
   * persisted per-slot — persisting would mean generating rows
   * indefinitely into the future for every doctor. This is the
   * natural place to add a short Redis cache (see schema.prisma
   * comment) once Week 2's Redis wiring lands; deliberately left
   * uncached for now so the logic itself stays easy to verify.
   */
  async getAvailableSlots(doctorId: string, dateStr: string) {
    await this.assertDoctorExists(doctorId);

    const date = new Date(dateStr + 'T00:00:00');
    if (isNaN(date.getTime())) throw new NotFoundException('Invalid date');
    const weekday = date.getDay();

    const templates = await this.prisma.availability.findMany({ where: { doctorId, weekday } });
    if (templates.length === 0) return [];

    const dayStart = new Date(date);
    const dayEnd = new Date(date);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const booked = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        scheduledAt: { gte: dayStart, lt: dayEnd },
        status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
        deletedAt: null,
      },
      select: { scheduledAt: true, durationMins: true },
    });

    const slots: { start: string; end: string }[] = [];

    for (const tpl of templates) {
      const [startH, startM] = tpl.startTime.split(':').map(Number);
      const [endH, endM] = tpl.endTime.split(':').map(Number);

      let cursor = new Date(date);
      cursor.setHours(startH, startM, 0, 0);
      const end = new Date(date);
      end.setHours(endH, endM, 0, 0);

      while (cursor.getTime() + tpl.slotMins * 60_000 <= end.getTime()) {
        const slotEnd = new Date(cursor.getTime() + tpl.slotMins * 60_000);

        const overlaps = booked.some((b) => {
          const bStart = b.scheduledAt.getTime();
          const bEnd = bStart + b.durationMins * 60_000;
          return cursor.getTime() < bEnd && slotEnd.getTime() > bStart;
        });

        if (!overlaps) {
          slots.push({ start: cursor.toISOString(), end: slotEnd.toISOString() });
        }

        cursor = slotEnd;
      }
    }

    return slots;
  }

  private async getDoctorForUser(user: AuthenticatedUser) {
    if (user.role !== Role.DOCTOR) throw new ForbiddenException('Only a doctor can manage their own availability');
    const doctor = await this.prisma.doctor.findUnique({ where: { userId: user.id } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');
    return doctor;
  }

  async getDoctorProfile(user: AuthenticatedUser) {
    return this.getDoctorForUser(user);
  }

  private async assertDoctorExists(doctorId: string) {
    const doctor = await this.prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');
    return doctor;
  }
}
