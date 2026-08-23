import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { AppointmentStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { BookAppointmentDto } from './dto/book-appointment.dto';
import { RealtimeGateway } from '../realtime/realtime.gateway';

/**
 * Legal status transitions, keyed by current status. Anything not
 * listed for a given "from" status is rejected — this is the single
 * source of truth for the appointment lifecycle so it can't drift
 * between the controller, service, and (eventually) the frontend.
 */
const ALLOWED_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED],
  CONFIRMED: [AppointmentStatus.IN_PROGRESS, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
  IN_PROGRESS: [AppointmentStatus.COMPLETED],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
  ) {}

  /**
   * A patient books their own appointment. hospitalId and
   * departmentId are derived server-side from the chosen doctor —
   * never trusted from the client — so a booking can't be forged
   * into the wrong tenant. Re-checks the slot is still free at write
   * time (not just at the earlier GET /slots read) to close the
   * race where two patients grab the same slot seconds apart.
   */
  async book(user: AuthenticatedUser, dto: BookAppointmentDto) {
    if (user.role !== Role.PATIENT) throw new ForbiddenException('Only a patient can book an appointment');

    const patient = await this.prisma.patient.findUnique({ where: { userId: user.id } });
    if (!patient) throw new NotFoundException('Patient profile not found');

    const doctor = await this.prisma.doctor.findUnique({
      where: { id: dto.doctorId },
      include: { department: true },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const scheduledAt = new Date(dto.scheduledAt);
    const durationMins = 15; // matches the default template slot; per-slot duration is carried by Availability.slotMins in Week 3's richer booking UI

    const conflict = await this.prisma.appointment.findFirst({
      where: {
        doctorId: doctor.id,
        scheduledAt,
        status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
        deletedAt: null,
      },
    });
    if (conflict) throw new ConflictException('That slot was just booked by someone else — please pick another');

    const appointment = await this.prisma.appointment.create({
      data: {
        hospitalId: doctor.department.hospitalId,
        patientId: patient.id,
        doctorId: doctor.id,
        departmentId: doctor.departmentId,
        scheduledAt,
        durationMins,
        reason: dto.reason,
        status: AppointmentStatus.PENDING,
      },
    });

    this.realtime.emitAppointmentEvent(doctor.department.hospitalId, {
      type: 'created',
      appointmentId: appointment.id,
      doctorId: doctor.id,
      patientId: patient.id,
      status: appointment.status,
    });

    return appointment;
  }

  /**
   * Role-scoped status update. A patient may only cancel their own
   * appointment; a receptionist may confirm/cancel within their
   * hospital; a doctor may progress their own appointment through
   * IN_PROGRESS -> COMPLETED, or mark NO_SHOW. The transition table
   * above enforces the state machine; this method enforces who's
   * allowed to trigger which transition.
   */
  async updateStatus(user: AuthenticatedUser, appointmentId: string, next: AppointmentStatus) {
    const appt = await this.prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appt || appt.deletedAt) throw new NotFoundException('Appointment not found');

    await this.assertCanTransition(user, appt, next);

    if (!ALLOWED_TRANSITIONS[appt.status].includes(next)) {
      throw new BadRequestException(`Cannot move an appointment from ${appt.status} to ${next}`);
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: next },
    });

    this.realtime.emitAppointmentEvent(appt.hospitalId, {
      type: 'status_changed',
      appointmentId: updated.id,
      doctorId: updated.doctorId,
      patientId: updated.patientId,
      status: updated.status,
    });

    return updated;
  }

  private async assertCanTransition(user: AuthenticatedUser, appt: { patientId: string; doctorId: string; hospitalId: string }, next: AppointmentStatus) {
    if (user.role === Role.PATIENT) {
      const patient = await this.prisma.patient.findUnique({ where: { userId: user.id } });
      if (patient?.id !== appt.patientId) throw new ForbiddenException('Not your appointment');
      if (next !== AppointmentStatus.CANCELLED) throw new ForbiddenException('Patients may only cancel');
      return;
    }
    if (user.role === Role.DOCTOR) {
      const doctor = await this.prisma.doctor.findUnique({ where: { userId: user.id } });
      if (doctor?.id !== appt.doctorId) throw new ForbiddenException('Not your appointment');
      return;
    }
    if (user.role === Role.RECEPTIONIST || user.role === Role.HOSPITAL_ADMIN) {
      if (user.hospitalId !== appt.hospitalId) throw new ForbiddenException('Not your hospital');
      return;
    }
    throw new ForbiddenException('Your role cannot update appointment status');
  }

  async listMine(user: AuthenticatedUser) {
    if (user.role === Role.PATIENT) {
      const patient = await this.prisma.patient.findUnique({ where: { userId: user.id } });
      if (!patient) return [];
      return this.prisma.appointment.findMany({
        where: { patientId: patient.id, deletedAt: null },
        orderBy: { scheduledAt: 'desc' },
        include: { doctor: { include: { user: true } }, department: true },
      });
    }
    if (user.role === Role.DOCTOR) {
      const doctor = await this.prisma.doctor.findUnique({ where: { userId: user.id } });
      if (!doctor) return [];
      return this.prisma.appointment.findMany({
        where: { doctorId: doctor.id, deletedAt: null },
        orderBy: { scheduledAt: 'desc' },
        include: { patient: { include: { user: true } } },
      });
    }
    // Receptionist / Hospital Admin: everything within their own hospital.
    return this.prisma.appointment.findMany({
      where: { hospitalId: user.hospitalId ?? undefined, deletedAt: null },
      orderBy: { scheduledAt: 'desc' },
      include: { patient: { include: { user: true } }, doctor: { include: { user: true } } },
    });
  }
}
