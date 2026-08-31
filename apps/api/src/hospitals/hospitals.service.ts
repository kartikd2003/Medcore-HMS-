import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { HospitalStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHospitalDto } from './dto/create-hospital.dto';

const SALT_ROUNDS = 12;

@Injectable()
export class HospitalsService {
  constructor(private prisma: PrismaService) {}

  async onboard(dto: CreateHospitalDto) {
    const [slugTaken, emailTaken] = await Promise.all([
      this.prisma.hospital.findUnique({ where: { slug: dto.slug } }),
      this.prisma.user.findUnique({ where: { email: dto.adminEmail } }),
    ]);
    if (slugTaken) throw new ConflictException('That hospital slug is already in use');
    if (emailTaken) throw new ConflictException('That admin email is already registered');

    const adminPasswordHash = await bcrypt.hash(dto.adminTemporaryPassword, SALT_ROUNDS);

    return this.prisma.$transaction(async (tx) => {
      const address = dto.address
        ? await tx.address.create({
            data: {
              line1: dto.address.line1,
              line2: dto.address.line2,
              city: dto.address.city,
              state: dto.address.state,
              postalCode: dto.address.postalCode,
              country: dto.address.country ?? 'IN',
            },
          })
        : null;

      const hospital = await tx.hospital.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          email: dto.email,
          phone: dto.phone,
          addressId: address?.id,
          status: HospitalStatus.PENDING_VERIFICATION,
        },
      });

      const admin = await tx.user.create({
        data: {
          email: dto.adminEmail,
          passwordHash: adminPasswordHash,
          firstName: dto.adminFirstName,
          lastName: dto.adminLastName,
          role: Role.HOSPITAL_ADMIN,
          hospitalId: hospital.id,
          isEmailVerified: true,
        },
        select: { id: true, email: true, firstName: true, lastName: true, role: true },
      });

      return { hospital, admin };
    });
  }

  async activate(hospitalId: string) {
    await this.assertExists(hospitalId);
    return this.prisma.hospital.update({
      where: { id: hospitalId },
      data: { status: HospitalStatus.ACTIVE },
    });
  }

  async suspend(hospitalId: string) {
    await this.assertExists(hospitalId);
    return this.prisma.hospital.update({
      where: { id: hospitalId },
      data: { status: HospitalStatus.SUSPENDED },
    });
  }

  async listAll() {
    return this.prisma.hospital.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Public-safe subset for a prospective patient picking a hospital
   * before browsing its doctors — id/name/slug only, ACTIVE only.
   * Deliberately not reusing listAll(): that returns every field
   * (email, phone, full address, PENDING/SUSPENDED tenants) which
   * isn't appropriate to expose with no authentication at all.
   */
  async listPublic() {
    return this.prisma.hospital.findMany({
      where: { deletedAt: null, status: HospitalStatus.ACTIVE },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(hospitalId: string) {
    return this.assertExists(hospitalId);
  }

  private async assertExists(hospitalId: string) {
    const hospital = await this.prisma.hospital.findUnique({ where: { id: hospitalId } });
    if (!hospital || hospital.deletedAt) throw new NotFoundException('Hospital not found');
    return hospital;
  }
}
