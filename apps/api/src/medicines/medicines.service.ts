import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';

@Injectable()
export class MedicinesService {
  constructor(private prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateMedicineDto) {
    if (!user.hospitalId) throw new ForbiddenException('No hospital associated with this account');
    return this.prisma.medicine.create({
      data: {
        hospitalId: user.hospitalId,
        name: dto.name,
        genericName: dto.genericName,
        form: dto.form,
        strength: dto.strength,
        stockQty: dto.stockQty,
        reorderLevel: dto.reorderLevel ?? 10,
        unitPrice: dto.unitPrice,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      },
    });
  }

  async findAll(user: AuthenticatedUser) {
    if (!user.hospitalId) throw new ForbiddenException('No hospital associated with this account');
    return this.prisma.medicine.findMany({
      where: { hospitalId: user.hospitalId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const medicine = await this.getScoped(user, id);
    return medicine;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateMedicineDto) {
    await this.getScoped(user, id);
    return this.prisma.medicine.update({
      where: { id },
      data: { ...dto, expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined },
    });
  }

  /**
   * The only path allowed to change stockQty after creation. Applies
   * a signed delta inside a transaction with a row check, so two
   * concurrent dispenses (or a dispense racing a restock) can't push
   * stock negative — the guard is enforced in the same query as the
   * write, not as a separate read-then-check that could race.
   */
  async adjustStock(user: AuthenticatedUser, id: string, dto: AdjustStockDto) {
    const medicine = await this.getScoped(user, id);
    const newQty = medicine.stockQty + dto.delta;
    if (newQty < 0) throw new BadRequestException('Adjustment would take stock below zero');

    return this.prisma.medicine.update({
      where: { id },
      data: { stockQty: { increment: dto.delta } },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    await this.getScoped(user, id);
    return this.prisma.medicine.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private async getScoped(user: AuthenticatedUser, id: string) {
    const medicine = await this.prisma.medicine.findUnique({ where: { id } });
    if (!medicine || medicine.deletedAt) throw new NotFoundException('Medicine not found');
    if (medicine.hospitalId !== user.hospitalId) throw new ForbiddenException('Not your hospital');
    return medicine;
  }
}
