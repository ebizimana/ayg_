import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateYearDto } from './dto/create-year.dto';
import { UpdateYearDto } from './dto/update-year.dto';

@Injectable()
export class YearsService {
  constructor(private prisma: PrismaService) {}

  private async assertYearOwnership(userId: string, yearId: string) {
    const year = await this.prisma.year.findFirst({
      where: { id: yearId, userId },
      select: { id: true },
    });

    if (!year) throw new ForbiddenException('Access denied');
  }

  async create(userId: string, dto: CreateYearDto) {
    return this.prisma.year.create({
      data: {
        userId,
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.year.findMany({
      where: { userId },
      orderBy: { startDate: 'asc' },
      include: {
        semesters: { orderBy: { startDate: 'asc' } },
      },
    });
  }

  async findOne(userId: string, id: string) {
    const year = await this.prisma.year.findUnique({ where: { id } });
    if (!year) throw new NotFoundException('Year not found');
    if (year.userId !== userId) throw new ForbiddenException('Access denied');
    return year;
  }

  async update(userId: string, id: string, dto: UpdateYearDto) {
    await this.assertYearOwnership(userId, id);
    return this.prisma.year.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.startDate !== undefined ? { startDate: new Date(dto.startDate) } : {}),
        ...(dto.endDate !== undefined ? { endDate: new Date(dto.endDate) } : {}),
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.assertYearOwnership(userId, id);
    return this.prisma.year.delete({ where: { id } });
  }
}
