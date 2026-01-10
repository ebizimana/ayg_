import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSemesterDto } from './dto/create-semester.dto';
import { UpdateSemesterDto } from './dto/update-semester.dto';
import { computeCoursePlan } from '../courses/grade-plan.util';
import type { GradeLetter } from '../courses/grade-plan.types';

@Injectable()
export class SemestersService {
  constructor(private prisma: PrismaService) {}

  private percentToLetter(percent: number): GradeLetter {
    if (percent >= 90) return 'A';
    if (percent >= 80) return 'B';
    if (percent >= 70) return 'C';
    if (percent >= 60) return 'D';
    return 'F';
  }

  private gradeTargetPercent(letter: GradeLetter): number {
    switch (letter) {
      case 'A':
        return 90;
      case 'B':
        return 80;
      case 'C':
        return 70;
      case 'D':
        return 60;
      case 'F':
      default:
        return 0;
    }
  }

  private computePointsLeftToLose(
    assignments: { maxPoints: number; earnedPoints: number | null }[],
    targetLetter: GradeLetter,
  ): number | null {
    if (!assignments.length) return null;
    const total = assignments.reduce((sum, a) => sum + a.maxPoints, 0);
    if (total === 0) return null;
    const targetPoints = (this.gradeTargetPercent(targetLetter) / 100) * total;
    const lostSoFar = assignments.reduce((sum, a) => {
      if (a.earnedPoints === null) return sum;
      return sum + Math.max(a.maxPoints - a.earnedPoints, 0);
    }, 0);
    const left = total - targetPoints - lostSoFar;
    return Math.max(Math.round(left), 0);
  }

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

  async runSimulations(userId: string, semesterId: string) {
    await this.findOne(userId, semesterId);

    const courses = await this.prisma.course.findMany({
      where: { semesterId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        categories: {
          include: {
            assignments: {
              include: { grade: true },
            },
          },
        },
      },
    });

    const updates = courses.map((course) => {
      const planInput = {
        id: course.id,
        name: course.name,
        desiredLetterGrade: (course.desiredLetterGrade ?? 'A') as GradeLetter,
        gradingMethod: course.gradingMethod ?? 'WEIGHTED',
        categories: course.categories.map((cat) => ({
          id: cat.id,
          name: cat.name,
          weightPercent: cat.weightPercent,
          dropLowest: cat.dropLowest,
          assignments: cat.assignments.map((a) => ({
            id: a.id,
            name: a.name,
            maxPoints: a.maxPoints,
            isExtraCredit: a.isExtraCredit,
            isGraded: a.isGraded,
            earnedPoints: a.grade?.earnedPoints ?? null,
            expectedPoints: a.grade?.expectedPoints ?? null,
          })),
        })),
      };

      const plan = computeCoursePlan(planInput);
      const percentValue = plan.actualPercent !== null ? Math.round(plan.actualPercent * 100) : null;
      const allAssignments = course.categories.flatMap((cat) =>
        cat.assignments.map((a) => ({
          maxPoints: a.maxPoints,
          earnedPoints: a.grade?.earnedPoints ?? null,
        })),
      );
      const pointsLeft = this.computePointsLeftToLose(allAssignments, planInput.desiredLetterGrade);

      return this.prisma.course.update({
        where: { id: course.id },
        data: {
          actualPercentGrade: percentValue,
          actualLetterGrade: percentValue === null ? null : this.percentToLetter(percentValue),
          actualPointsLeftToLose: pointsLeft,
        },
      });
    });

    return this.prisma.$transaction(updates);
  }
}
