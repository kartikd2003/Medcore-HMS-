import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { AppointmentStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class MedicalRecordsService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
  ) {}

  /**
   * Only the doctor actually running the appointment can write its
   * record, and only while it's IN_PROGRESS — this is the doctor
   * "closing out" the consult. Creating the record and completing
   * the appointment happen together in one transaction: a record
   * without a completed appointment (or vice versa) would be an
   * inconsistent clinical state, so there's no path to one without
   * the other.
   */
  async create(user: AuthenticatedUser, dto: CreateMedicalRecordDto) {
    if (user.role !== Role.DOCTOR) throw new ForbiddenException('Only the treating doctor can write a medical record');

    const doctor = await this.prisma.doctor.findUnique({ where: { userId: user.id } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    const appointment = await this.prisma.appointment.findUnique({ where: { id: dto.appointmentId } });
    if (!appointment || appointment.deletedAt) throw new NotFoundException('Appointment not found');
    if (appointment.doctorId !== doctor.id) throw new ForbiddenException('Not your appointment');
    if (appointment.status !== AppointmentStatus.IN_PROGRESS) {
      throw new BadRequestException('Appointment must be IN_PROGRESS to record a consult');
    }

    const existing = await this.prisma.medicalRecord.findUnique({ where: { appointmentId: dto.appointmentId } });
    if (existing) throw new BadRequestException('A medical record already exists for this appointment');

    // Validate referenced medicines/lab tests belong to this hospital
    // BEFORE the transaction opens, so a bad id fails fast with a
    // clear 404 instead of a generic transaction rollback error.
    if (dto.prescriptionItems?.length) {
      const medicineIds = dto.prescriptionItems.map((i) => i.medicineId);
      const found = await this.prisma.medicine.findMany({
        where: { id: { in: medicineIds }, hospitalId: appointment.hospitalId, deletedAt: null },
      });
      if (found.length !== new Set(medicineIds).size) {
        throw new NotFoundException('One or more prescribed medicines were not found in this hospital');
      }
    }
    if (dto.labTestIds?.length) {
      const found = await this.prisma.labTest.findMany({
        where: { id: { in: dto.labTestIds }, hospitalId: appointment.hospitalId, deletedAt: null },
      });
      if (found.length !== new Set(dto.labTestIds).size) {
        throw new NotFoundException('One or more ordered lab tests were not found in this hospital');
      }
    }

    const record = await this.prisma.$transaction(async (tx) => {
      const created = await tx.medicalRecord.create({
        data: {
          hospitalId: appointment.hospitalId,
          appointmentId: appointment.id,
          patientId: appointment.patientId,
          doctorId: doctor.id,
          heightCm: dto.heightCm,
          weightKg: dto.weightKg,
          bloodPressure: dto.bloodPressure,
          pulseBpm: dto.pulseBpm,
          temperatureC: dto.temperatureC,
          diagnosis: dto.diagnosis,
          treatmentPlan: dto.treatmentPlan,
          notes: dto.notes,
        },
      });

      if (dto.prescriptionItems?.length) {
        await tx.prescription.create({
          data: {
            hospitalId: appointment.hospitalId,
            medicalRecordId: created.id,
            items: {
              create: dto.prescriptionItems.map((item) => ({
                medicineId: item.medicineId,
                dosage: item.dosage,
                frequency: item.frequency,
                durationDays: item.durationDays,
                instructions: item.instructions,
              })),
            },
          },
        });
      }

      if (dto.labTestIds?.length) {
        await tx.labOrder.createMany({
          data: dto.labTestIds.map((labTestId) => ({
            hospitalId: appointment.hospitalId,
            medicalRecordId: created.id,
            labTestId,
          })),
        });
      }

      await tx.appointment.update({
        where: { id: appointment.id },
        data: { status: AppointmentStatus.COMPLETED },
      });

      return created;
    });

    this.realtime.emitAppointmentEvent(appointment.hospitalId, {
      type: 'status_changed',
      appointmentId: appointment.id,
      doctorId: doctor.id,
      patientId: appointment.patientId,
      status: AppointmentStatus.COMPLETED,
    });

    return record;
  }

  /**
   * Visible to: the patient it belongs to, the doctor who wrote it,
   * or a Hospital Admin within that hospital (for oversight/billing
   * hand-off). No other role gets clinical detail.
   */
  async findOne(user: AuthenticatedUser, id: string) {
    const record = await this.prisma.medicalRecord.findUnique({
      where: { id },
      include: {
        prescription: { include: { items: { include: { medicine: true } } } },
        labOrders: { include: { labTest: true } },
      },
    });
    if (!record) throw new NotFoundException('Medical record not found');

    if (user.role === Role.PATIENT) {
      const patient = await this.prisma.patient.findUnique({ where: { userId: user.id } });
      if (patient?.id !== record.patientId) throw new ForbiddenException('Not your record');
    } else if (user.role === Role.DOCTOR) {
      const doctor = await this.prisma.doctor.findUnique({ where: { userId: user.id } });
      if (doctor?.id !== record.doctorId) throw new ForbiddenException('Not your record');
    } else if (user.role === Role.HOSPITAL_ADMIN) {
      if (user.hospitalId !== record.hospitalId) throw new ForbiddenException('Not your hospital');
    } else {
      throw new ForbiddenException('Your role cannot view medical records');
    }

    return record;
  }

  async listForPatient(user: AuthenticatedUser) {
    if (user.role !== Role.PATIENT) throw new ForbiddenException('Only a patient can list their own records');
    const patient = await this.prisma.patient.findUnique({ where: { userId: user.id } });
    if (!patient) return [];
    return this.prisma.medicalRecord.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' },
      include: { doctor: { include: { user: true } } },
    });
  }
}
