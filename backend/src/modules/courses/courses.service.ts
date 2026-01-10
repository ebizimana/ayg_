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

    return this.prisma.$transaction(async (tx) => {
      const maxOrder = await tx.course.aggregate({
        where: { semesterId },
        _max: { sortOrder: true },
      });
      const sortOrder = (maxOrder._max.sortOrder ?? 0) + 1;

      const course = await tx.course.create({
        data: {
          semesterId,
          code: dto.code ?? '',
          name: dto.name,
          credits: dto.credits,
          desiredLetterGrade: dto.desiredLetterGrade,
          gradingMethod: dto.gradingMethod ?? 'WEIGHTED',
          gradingScaleId: dto.gradingScaleId ?? null,
          sortOrder,
          isDemo: dto.isDemo ?? false,
        },
      });

      if (course.gradingMethod === 'POINTS') {
        await tx.gradeCategory.create({
          data: {
            courseId: course.id,
            name: 'All Assignments',
            weightPercent: 0,
            dropLowest: 0,
            sortOrder: 1,
          },
        });
      }

      return course;
    });
  }

  async findAllForSemester(userId: string, semesterId: string) {
    await this.assertSemesterOwnership(userId, semesterId);

    return this.prisma.course.findMany({
      where: { semesterId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
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

    return computeCoursePlan(planInput);
  }

  async update(userId: string, courseId: string, dto: UpdateCourseDto) {
    await this.assertCourseOwnership(userId, courseId);

    if (dto.gradingMethod !== undefined) {
      const existing = await this.prisma.course.findUnique({
        where: { id: courseId },
        select: { gradingMethod: true },
      });
      if (existing && existing.gradingMethod !== dto.gradingMethod) {
        const assignmentCount = await this.prisma.assignment.count({
          where: { category: { courseId } },
        });
        if (assignmentCount > 0) {
          throw new ForbiddenException('Cannot change grading method after assignments exist.');
        }
      }
    }

    const updated = await this.prisma.course.update({
      where: { id: courseId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.code !== undefined ? { code: dto.code } : {}),
        ...(dto.credits !== undefined ? { credits: dto.credits } : {}),
        ...(dto.desiredLetterGrade !== undefined ? { desiredLetterGrade: dto.desiredLetterGrade } : {}),
        ...(dto.gradingMethod !== undefined ? { gradingMethod: dto.gradingMethod } : {}),
        ...(dto.gradingScaleId !== undefined ? { gradingScaleId: dto.gradingScaleId } : {}),
        ...(dto.actualLetterGrade !== undefined ? { actualLetterGrade: dto.actualLetterGrade } : {}),
        ...(dto.actualPercentGrade !== undefined ? { actualPercentGrade: dto.actualPercentGrade } : {}),
        ...(dto.actualPointsLeftToLose !== undefined ? { actualPointsLeftToLose: dto.actualPointsLeftToLose } : {}),
        ...(dto.gradeFinalizedAt !== undefined
          ? { gradeFinalizedAt: dto.gradeFinalizedAt ? new Date(dto.gradeFinalizedAt) : null }
          : {}),

      },
    });

    if (dto.gradingMethod === 'POINTS') {
      const categoryCount = await this.prisma.gradeCategory.count({ where: { courseId } });
      if (categoryCount === 0) {
        await this.prisma.gradeCategory.create({
          data: {
            courseId,
            name: 'All Assignments',
            weightPercent: 0,
            dropLowest: 0,
            sortOrder: 1,
          },
        });
      }
    }

    return updated;
  }

  async remove(userId: string, courseId: string) {
    await this.assertCourseOwnership(userId, courseId);
    return this.prisma.course.delete({ where: { id: courseId } });
  }

  async updateOrder(userId: string, semesterId: string, orderedIds: string[]) {
    if (!orderedIds.length) return { count: 0 };

    await this.assertSemesterOwnership(userId, semesterId);

    const courses = await this.prisma.course.findMany({
      where: { id: { in: orderedIds }, semesterId },
      select: { id: true },
    });

    if (courses.length !== orderedIds.length) {
      throw new ForbiddenException('Access denied');
    }

    const orderMap = new Map(orderedIds.map((id, index) => [id, index + 1]));
    await this.prisma.$transaction(
      courses.map((course) =>
        this.prisma.course.update({
          where: { id: course.id },
          data: { sortOrder: orderMap.get(course.id) ?? 0 },
        }),
      ),
    );

    return { count: courses.length };
  }
}
