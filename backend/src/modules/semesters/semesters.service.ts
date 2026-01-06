import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSemesterDto } from './dto/create-semester.dto';
import { UpdateSemesterDto } from './dto/update-semester.dto';

@Injectable()
export class SemestersService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateSemesterDto) {
    return this.prisma.semester.create({
      data: {
        userId,
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.semester.findMany({
      where: { userId },
      orderBy: { startDate: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const semester = await this.prisma.semester.findUnique({ where: { id } });
    if (!semester) throw new NotFoundException('Semester not found');
    if (semester.userId !== userId) throw new ForbiddenException('Access denied');
    return semester;
  }

  async update(userId: string, id: string, dto: UpdateSemesterDto) {
    // Reuse ownership check
    await this.findOne(userId, id);

    return this.prisma.semester.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.startDate !== undefined ? { startDate: new Date(dto.startDate) } : {}),
        ...(dto.endDate !== undefined ? { endDate: new Date(dto.endDate) } : {}),
      },
    });
  }

  async remove(userId: string, id: string) {
    // Reuse ownership check
    await this.findOne(userId, id);
    return this.prisma.semester.delete({ where: { id } });
  }
}
