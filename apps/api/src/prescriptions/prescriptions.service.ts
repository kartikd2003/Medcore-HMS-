import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { NotificationChannel, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';

const PHARMACY_STAFF_ROLES: Role[] = [Role.PHARMACIST, Role.HOSPITAL_ADMIN];

@Injectable()
export class PrescriptionsService {
  constructor(private prisma: PrismaService) {}

  async findOne(user: AuthenticatedUser, id: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      include: { items: { include: { medicine: true } }, medicalRecord: true },
    });
    if (!prescription) throw new NotFoundException('Prescription not found');
    await this.assertCanView(user, prescription.hospitalId, prescription.medicalRecord.patientId, prescription.medicalRecord.doctorId);
    return prescription;
  }

  async listMine(user: AuthenticatedUser) {
    if (user.role !== Role.PATIENT) throw new ForbiddenException('Only a patient can list their own prescriptions');
    const patient = await this.prisma.patient.findUnique({ where: { userId: user.id } });
    if (!patient) return [];
    return this.prisma.prescription.findMany({
      where: { medicalRecord: { patientId: patient.id } },
      include: { items: { include: { medicine: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Pending (not yet dispensed) items across the pharmacist's own hospital — the pharmacy queue. */
  async listPending(user: AuthenticatedUser) {
    if (!PHARMACY_STAFF_ROLES.includes(user.role) || !user.hospitalId) {
      throw new ForbiddenException('Only pharmacy staff can view the dispense queue');
    }
    return this.prisma.prescriptionItem.findMany({
      where: { dispensedAt: null, prescription: { hospitalId: user.hospitalId } },
      include: { medicine: true, prescription: { include: { medicalRecord: { include: { patient: { include: { user: true } } } } } } },
      orderBy: { id: 'asc' },
    });
  }

  /**
   * Dispenses one prescription item: decrements the medicine's stock
   * and stamps dispensedAt. Stock check + decrement happen in the
   * same transaction so two pharmacists dispensing concurrently
   * can't both succeed against stock that only covers one of them.
   * Fires a low-stock notification to the hospital's pharmacy staff
   * when the post-dispense quantity drops to/below the reorder level.
   */
  async dispense(user: AuthenticatedUser, itemId: string) {
    if (!PHARMACY_STAFF_ROLES.includes(user.role) || !user.hospitalId) {
      throw new ForbiddenException('Only pharmacy staff can dispense');
    }

    const item = await this.prisma.prescriptionItem.findUnique({
      where: { id: itemId },
      include: { medicine: true, prescription: true },
    });
    if (!item) throw new NotFoundException('Prescription item not found');
    if (item.prescription.hospitalId !== user.hospitalId) throw new ForbiddenException('Not your hospital');
    if (item.dispensedAt) throw new BadRequestException('This item has already been dispensed');
    if (item.medicine.stockQty <= 0) throw new BadRequestException(`${item.medicine.name} is out of stock`);

    const updated = await this.prisma.$transaction(async (tx) => {
      // Re-read stock inside the transaction to guard against a
      // concurrent dispense that ran between the check above and now.
      const fresh = await tx.medicine.findUniqueOrThrow({ where: { id: item.medicineId } });
      if (fresh.stockQty <= 0) throw new BadRequestException(`${item.medicine.name} is out of stock`);

      const medicine = await tx.medicine.update({
        where: { id: item.medicineId },
        data: { stockQty: { decrement: 1 } },
      });

      const dispensedItem = await tx.prescriptionItem.update({
        where: { id: itemId },
        data: { dispensedAt: new Date() },
      });

      if (medicine.stockQty <= medicine.reorderLevel) {
        const recipients = await tx.user.findMany({
          where: { hospitalId: user.hospitalId!, role: { in: [Role.PHARMACIST, Role.HOSPITAL_ADMIN] }, isActive: true },
          select: { id: true },
        });
        if (recipients.length) {
          await tx.notification.createMany({
            data: recipients.map((r) => ({
              userId: r.id,
              channel: NotificationChannel.IN_APP,
              title: 'Low stock alert',
              body: `${medicine.name} is at ${medicine.stockQty} units (reorder level: ${medicine.reorderLevel})`,
              entityType: 'Medicine',
              entityId: medicine.id,
            })),
          });
        }
      }

      return dispensedItem;
    });

    return updated;
  }

  private async assertCanView(user: AuthenticatedUser, hospitalId: string, patientId: string, doctorId: string) {
    if (user.role === Role.PATIENT) {
      const patient = await this.prisma.patient.findUnique({ where: { userId: user.id } });
      if (patient?.id !== patientId) throw new ForbiddenException('Not your prescription');
    } else if (user.role === Role.DOCTOR) {
      const doctor = await this.prisma.doctor.findUnique({ where: { userId: user.id } });
      if (doctor?.id !== doctorId) throw new ForbiddenException('Not your prescription');
    } else if (PHARMACY_STAFF_ROLES.includes(user.role)) {
      if (user.hospitalId !== hospitalId) throw new ForbiddenException('Not your hospital');
    } else {
      throw new ForbiddenException('Your role cannot view prescriptions');
    }
  }
}
