import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { LabOrderStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { UploadResultDto } from './dto/upload-result.dto';

const LAB_STAFF_ROLES: Role[] = [Role.LAB_TECHNICIAN, Role.HOSPITAL_ADMIN];

/** Same pattern as Appointment's transition table — one source of truth for the lab workflow's legal moves. */
const ALLOWED_TRANSITIONS: Record<LabOrderStatus, LabOrderStatus[]> = {
  ORDERED: [LabOrderStatus.SAMPLE_COLLECTED],
  SAMPLE_COLLECTED: [LabOrderStatus.RESULT_UPLOADED],
  RESULT_UPLOADED: [LabOrderStatus.APPROVED, LabOrderStatus.REJECTED],
  APPROVED: [],
  REJECTED: [LabOrderStatus.SAMPLE_COLLECTED], // a rejected result can be redone from a fresh sample
};

@Injectable()
export class LabOrdersService {
  constructor(private prisma: PrismaService) {}

  /** The lab's work queue for their own hospital, optionally filtered by status. */
  async listForHospital(user: AuthenticatedUser, status?: LabOrderStatus) {
    if (!LAB_STAFF_ROLES.includes(user.role) || !user.hospitalId) {
      throw new ForbiddenException('Only lab staff can view the lab queue');
    }
    return this.prisma.labOrder.findMany({
      where: { hospitalId: user.hospitalId, ...(status ? { status } : {}) },
      include: { labTest: true, medicalRecord: { include: { patient: { include: { user: true } } } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const order = await this.prisma.labOrder.findUnique({
      where: { id },
      include: { labTest: true, medicalRecord: true },
    });
    if (!order) throw new NotFoundException('Lab order not found');
    await this.assertCanView(user, order.hospitalId, order.medicalRecord.patientId, order.medicalRecord.doctorId);
    return order;
  }

  async collectSample(user: AuthenticatedUser, id: string) {
    return this.transition(user, id, LabOrderStatus.SAMPLE_COLLECTED, {});
  }

  async uploadResult(user: AuthenticatedUser, id: string, dto: UploadResultDto) {
    if (!dto.resultData && !dto.resultFileUrl) {
      throw new BadRequestException('Provide resultData, resultFileUrl, or both');
    }
    return this.transition(user, id, LabOrderStatus.RESULT_UPLOADED, {
      resultData: dto.resultData,
      resultFileUrl: dto.resultFileUrl,
    });
  }

  /**
   * Approval is deliberately allowed by any lab tech in the hospital,
   * not gated to "someone other than the uploader" — enforcing a true
   * four-eyes check needs an uploadedById column this schema doesn't
   * have yet. Noting the gap rather than pretending it's covered.
   */
  async approve(user: AuthenticatedUser, id: string) {
    return this.transition(user, id, LabOrderStatus.APPROVED, {
      approvedById: user.id,
      approvedAt: new Date(),
    });
  }

  async reject(user: AuthenticatedUser, id: string) {
    return this.transition(user, id, LabOrderStatus.REJECTED, {});
  }

  private async transition(user: AuthenticatedUser, id: string, next: LabOrderStatus, extraData: Record<string, any>) {
    if (!LAB_STAFF_ROLES.includes(user.role) || !user.hospitalId) {
      throw new ForbiddenException('Only lab staff can update a lab order');
    }

    const order = await this.prisma.labOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Lab order not found');
    if (order.hospitalId !== user.hospitalId) throw new ForbiddenException('Not your hospital');

    if (!ALLOWED_TRANSITIONS[order.status].includes(next)) {
      throw new BadRequestException(`Cannot move a lab order from ${order.status} to ${next}`);
    }

    return this.prisma.labOrder.update({ where: { id }, data: { status: next, ...extraData } });
  }

  private async assertCanView(user: AuthenticatedUser, hospitalId: string, patientId: string, doctorId: string) {
    if (user.role === Role.PATIENT) {
      const patient = await this.prisma.patient.findUnique({ where: { userId: user.id } });
      if (patient?.id !== patientId) throw new ForbiddenException('Not your lab order');
    } else if (user.role === Role.DOCTOR) {
      const doctor = await this.prisma.doctor.findUnique({ where: { userId: user.id } });
      if (doctor?.id !== doctorId) throw new ForbiddenException('Not your lab order');
    } else if (LAB_STAFF_ROLES.includes(user.role)) {
      if (user.hospitalId !== hospitalId) throw new ForbiddenException('Not your hospital');
    } else {
      throw new ForbiddenException('Your role cannot view lab orders');
    }
  }
}
