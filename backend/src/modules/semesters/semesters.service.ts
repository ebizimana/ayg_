import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSemesterDto } from './dto/create-semester.dto';
import { UpdateSemesterDto } from './dto/update-semester.dto';
import { computeCoursePlan } from '../courses/grade-plan.util';
import type { GradeLetter } from '../courses/grade-plan.types';
import { TargetGpaService } from '../target-gpa/target-gpa.service';

@Injectable()
export class SemestersService {
  constructor(private prisma: PrismaService, private targetGpaService: TargetGpaService) {}

  private async assertYearOwnership(userId: string, yearId: string) {
    const year = await this.prisma.year.findFirst({
      where: { id: yearId, userId },
      select: { id: true },
    });

    if (!year) throw new ForbiddenException('Access denied');
  }

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
    await this.assertYearOwnership(userId, dto.yearId);
    const year = await this.prisma.year.findUnique({
      where: { id: dto.yearId },
      select: { startDate: true, endDate: true },
    });
    if (!year) throw new NotFoundException('Year not found');
    return this.prisma.semester.create({
      data: {
        yearId: dto.yearId,
        name: dto.name,
        startDate: dto.startDate ? new Date(dto.startDate) : year.startDate,
        endDate: dto.endDate ? new Date(dto.endDate) : year.endDate,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.semester.findMany({
      where: { year: { userId } },
      orderBy: { startDate: 'desc' },
      include: {
        year: { select: { id: true, name: true, startDate: true, endDate: true } },
      },
    });
  }

  async findOne(userId: string, id: string) {
    const semester = await this.prisma.semester.findUnique({
      where: { id },
      include: { year: { select: { userId: true } } },
    });
    if (!semester) throw new NotFoundException('Semester not found');
    if (semester.year.userId !== userId) throw new ForbiddenException('Access denied');
    return semester;
  }

  async update(userId: string, id: string, dto: UpdateSemesterDto) {
    // Reuse ownership check
    await this.findOne(userId, id);
    let yearDates: { startDate: Date; endDate: Date } | null = null;
    if (dto.yearId) {
      await this.assertYearOwnership(userId, dto.yearId);
      yearDates = await this.prisma.year.findUnique({
        where: { id: dto.yearId },
        select: { startDate: true, endDate: true },
      });
      if (!yearDates) throw new NotFoundException('Year not found');
    }

    const updated = await this.prisma.semester.update({
      where: { id },
      data: {
        ...(dto.yearId !== undefined ? { yearId: dto.yearId } : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(yearDates ? { startDate: yearDates.startDate, endDate: yearDates.endDate } : {}),
        ...(dto.startDate !== undefined && !yearDates ? { startDate: new Date(dto.startDate) } : {}),
        ...(dto.endDate !== undefined && !yearDates ? { endDate: new Date(dto.endDate) } : {}),
      },
    });

    if (dto.yearId) {
      const yearTarget = await this.prisma.targetGpaSession.findFirst({
        where: { scope: 'YEAR', yearId: dto.yearId, disabledAt: null },
        select: { id: true },
      });
      if (yearTarget) {
        await this.targetGpaService.disable(userId, { scope: 'SEMESTER', semesterId: id });
      }
      await this.targetGpaService.recomputeForCourseChange(userId, id);
    }

    return updated;
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
