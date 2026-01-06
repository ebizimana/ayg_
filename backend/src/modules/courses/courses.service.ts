import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { computeCoursePlan } from './grade-plan.util';
import { GradePlanQueryDto } from './dto/grade-plan.dto';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) { }

  private async assertSemesterOwnership(userId: string, semesterId: string) {
    const semester = await this.prisma.semester.findFirst({
      where: { id: semesterId, userId },
      select: { id: true },
    });

    if (!semester) throw new ForbiddenException('Access denied');
  }

  private async assertCourseOwnership(userId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, semesterId: true },
    });

    if (!course) throw new NotFoundException('Course not found');

    await this.assertSemesterOwnership(userId, course.semesterId);
    return course;
  }

  async create(userId: string, semesterId: string, dto: CreateCourseDto) {
    await this.assertSemesterOwnership(userId, semesterId);

    return this.prisma.course.create({
      data: {
        semesterId,
        code: dto.code ?? '',
        name: dto.name,
        credits: dto.credits,
        desiredLetterGrade: dto.desiredLetterGrade,
        gradingScaleId: dto.gradingScaleId ?? null,
      },
    });
  }

  async findAllForSemester(userId: string, semesterId: string) {
    await this.assertSemesterOwnership(userId, semesterId);

    return this.prisma.course.findMany({
      where: { semesterId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, courseId: string) {
    await this.assertCourseOwnership(userId, courseId);

    return this.prisma.course.findUnique({ where: { id: courseId } });
  }

  async gradePlan(userId: string, courseId: string, query: GradePlanQueryDto) {
    await this.assertCourseOwnership(userId, courseId);

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        categories: {
          include: {
            assignments: {
              include: {
                grade: true,
              },
            },
          },
        },
      },
    });

    if (!course) throw new NotFoundException('Course not found');

    const planInput = {
      id: course.id,
      name: course.name,
      desiredLetterGrade: (query.desiredGrade ?? 'A') as any,
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

    return computeCoursePlan(planInput);
  }

  async update(userId: string, courseId: string, dto: UpdateCourseDto) {
    await this.assertCourseOwnership(userId, courseId);

    return this.prisma.course.update({
      where: { id: courseId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.code !== undefined ? { code: dto.code } : {}),
        ...(dto.credits !== undefined ? { credits: dto.credits } : {}),
        ...(dto.desiredLetterGrade !== undefined ? { desiredLetterGrade: dto.desiredLetterGrade } : {}),
        ...(dto.gradingScaleId !== undefined ? { gradingScaleId: dto.gradingScaleId } : {}),
        ...(dto.actualLetterGrade !== undefined ? { actualLetterGrade: dto.actualLetterGrade } : {}),
        ...(dto.actualPercentGrade !== undefined ? { actualPercentGrade: dto.actualPercentGrade } : {}),
        ...(dto.gradeFinalizedAt !== undefined
          ? { gradeFinalizedAt: dto.gradeFinalizedAt ? new Date(dto.gradeFinalizedAt) : null }
          : {}),

      },
    });
  }

  async remove(userId: string, courseId: string) {
    await this.assertCourseOwnership(userId, courseId);
    return this.prisma.course.delete({ where: { id: courseId } });
  }
}
