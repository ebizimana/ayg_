import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  private async assertCourseOwnership(userId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, semesterId: true, gradingMethod: true },
    });

    if (!course) throw new NotFoundException('Course not found');

    const semester = await this.prisma.semester.findFirst({
      where: { id: course.semesterId, userId },
      select: { id: true },
    });

    if (!semester) throw new ForbiddenException('Access denied');
    return course;
  }

  private async assertCategoryOwnership(userId: string, categoryId: string) {
    const cat = await this.prisma.gradeCategory.findUnique({
      where: { id: categoryId },
      select: { id: true, courseId: true },
    });

    if (!cat) throw new NotFoundException('Category not found');

    await this.assertCourseOwnership(userId, cat.courseId);
    return cat;
  }

  async create(userId: string, courseId: string, dto: CreateCategoryDto) {
    const course = await this.assertCourseOwnership(userId, courseId);

    if (course.gradingMethod !== 'POINTS') {
      const currentTotal = await this.getTotalWeight(courseId);
      const nextTotal = currentTotal + dto.weightPercent;

      if (nextTotal > 100) {
        throw new BadRequestException(
          `Category weights exceed 100%. Current: ${currentTotal}%, adding: ${dto.weightPercent}%, would become: ${nextTotal}%`,
        );
      }
    }

    const maxOrder = await this.prisma.gradeCategory.aggregate({
      where: { courseId },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxOrder._max.sortOrder ?? 0) + 1;

    return this.prisma.gradeCategory.create({
      data: {
        courseId,
        name: dto.name,
        weightPercent: dto.weightPercent,
        dropLowest: dto.dropLowest ?? 0,
        sortOrder,
      },
    });
  }

  async findAllForCourse(userId: string, courseId: string) {
    await this.assertCourseOwnership(userId, courseId);

    return this.prisma.gradeCategory.findMany({
      where: { courseId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { assignments: true } },
      },
    });
  }

  async findOne(userId: string, categoryId: string) {
    await this.assertCategoryOwnership(userId, categoryId);
    return this.prisma.gradeCategory.findUnique({ where: { id: categoryId } });
  }

  async update(userId: string, categoryId: string, dto: UpdateCategoryDto) {
    await this.assertCategoryOwnership(userId, categoryId);

    if (dto.weightPercent !== undefined) {
      const existing = await this.prisma.gradeCategory.findUnique({
        where: { id: categoryId },
        select: { courseId: true, weightPercent: true },
      });
      if (!existing) throw new NotFoundException('Category not found');

      const course = await this.assertCourseOwnership(userId, existing.courseId);
      if (course.gradingMethod !== 'POINTS') {
        const currentTotal = await this.getTotalWeight(existing.courseId);
        const nextTotal = currentTotal - existing.weightPercent + dto.weightPercent;

        if (nextTotal > 100) {
          throw new BadRequestException(
            `Category weights exceed 100%. Current: ${currentTotal}%, updating would become: ${nextTotal}%`,
          );
        }
      }
    }

    return this.prisma.gradeCategory.update({
      where: { id: categoryId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.weightPercent !== undefined ? { weightPercent: dto.weightPercent } : {}),
        ...(dto.dropLowest !== undefined ? { dropLowest: dto.dropLowest } : {}),
      },
    });
  }

  async remove(userId: string, categoryId: string) {
    await this.assertCategoryOwnership(userId, categoryId);
    return this.prisma.gradeCategory.delete({ where: { id: categoryId } });
  }

  async updateOrder(userId: string, orderedIds: string[]) {
    if (!orderedIds.length) return { count: 0 };

    const categories = await this.prisma.gradeCategory.findMany({
      where: {
        id: { in: orderedIds },
        course: { semester: { userId } },
      },
      select: { id: true, courseId: true },
    });

    if (categories.length !== orderedIds.length) {
      throw new ForbiddenException('Access denied');
    }

    const courseIds = new Set(categories.map((c) => c.courseId));
    if (courseIds.size !== 1) {
      throw new BadRequestException('Categories must belong to the same course');
    }

    const orderMap = new Map(orderedIds.map((id, index) => [id, index + 1]));
    await this.prisma.$transaction(
      categories.map((category) =>
        this.prisma.gradeCategory.update({
          where: { id: category.id },
          data: { sortOrder: orderMap.get(category.id) ?? 0 },
        }),
      ),
    );

    return { count: categories.length };
  }

  private async getTotalWeight(courseId: string) {
    const rows = await this.prisma.gradeCategory.findMany({
      where: { courseId },
      select: { weightPercent: true },
    });

    return rows.reduce((sum, r) => sum + r.weightPercent, 0);
  }

}
