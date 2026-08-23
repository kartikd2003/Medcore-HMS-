import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { CreateLabTestDto } from './dto/create-lab-test.dto';
import { UpdateLabTestDto } from './dto/update-lab-test.dto';

@Injectable()
export class LabTestsService {
  constructor(private prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateLabTestDto) {
    if (!user.hospitalId) throw new ForbiddenException('No hospital associated with this account');
    return this.prisma.labTest.create({
      data: {
        hospitalId: user.hospitalId,
        name: dto.name,
        code: dto.code,
        price: dto.price,
        turnaroundHrs: dto.turnaroundHrs,
      },
    });
  }

  async findAll(user: AuthenticatedUser) {
    if (!user.hospitalId) throw new ForbiddenException('No hospital associated with this account');
    return this.prisma.labTest.findMany({
      where: { hospitalId: user.hospitalId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    return this.getScoped(user, id);
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateLabTestDto) {
    await this.getScoped(user, id);
    return this.prisma.labTest.update({ where: { id }, data: dto });
  }

  async remove(user: AuthenticatedUser, id: string) {
    await this.getScoped(user, id);
    return this.prisma.labTest.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private async getScoped(user: AuthenticatedUser, id: string) {
    const test = await this.prisma.labTest.findUnique({ where: { id } });
    if (!test || test.deletedAt) throw new NotFoundException('Lab test not found');
    if (test.hospitalId !== user.hospitalId) throw new ForbiddenException('Not your hospital');
    return test;
  }
}
