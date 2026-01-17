import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';

@Injectable()
export class AssignmentsService {
  constructor(private prisma: PrismaService) {}

  private async assertCategoryOwnership(userId: string, categoryId: string) {
    const category = await this.prisma.gradeCategory.findUnique({
      where: { id: categoryId },
      select: { id: true, courseId: true },
    });

    if (!category) throw new NotFoundException('Category not found');

    const course = await this.prisma.course.findUnique({
      where: { id: category.courseId },
      select: { semesterId: true },
    });

    if (!course) throw new NotFoundException('Course not found');

    const semester = await this.prisma.semester.findFirst({
      where: { id: course.semesterId, year: { userId } },
      select: { id: true },
    });

    if (!semester) throw new ForbiddenException('Access denied');

    return category;
  }

  private async assertAssignmentOwnership(userId: string, assignmentId: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { id: true, categoryId: true },
    });

    if (!assignment) throw new NotFoundException('Assignment not found');

    await this.assertCategoryOwnership(userId, assignment.categoryId);
    return assignment;
  }

  async create(userId: string, categoryId: string, dto: CreateAssignmentDto) {
    const category = await this.assertCategoryOwnership(userId, categoryId);
    const maxOrder = await this.prisma.assignment.aggregate({
      where: { category: { courseId: category.courseId } },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxOrder._max.sortOrder ?? 0) + 1;

    return this.prisma.assignment.create({
      data: {
        categoryId,
        name: dto.name,
        maxPoints: dto.maxPoints,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        isExtraCredit: dto.isExtraCredit ?? false,
        sortOrder,
      },
    });
  }

  async findAllForCategory(userId: string, categoryId: string) {
    await this.assertCategoryOwnership(userId, categoryId);

    return this.prisma.assignment.findMany({
      where: { categoryId },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      include: { grade: true },
    });
  }

  async findOne(userId: string, assignmentId: string) {
    await this.assertAssignmentOwnership(userId, assignmentId);
    return this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { grade: true },
    });
  }

  async update(userId: string, assignmentId: string, dto: UpdateAssignmentDto) {
    const assignment = await this.assertAssignmentOwnership(userId, assignmentId);

    if (dto.categoryId && dto.categoryId !== assignment.categoryId) {
      const newCategory = await this.assertCategoryOwnership(userId, dto.categoryId);
      const currentCategory = await this.prisma.gradeCategory.findUnique({
        where: { id: assignment.categoryId },
        select: { courseId: true },
      });

      if (!currentCategory) throw new NotFoundException('Category not found');
      if (newCategory.courseId !== currentCategory.courseId) {
        throw new ForbiddenException('Cannot move assignment to a different course');
      }
    }

    return this.prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.maxPoints !== undefined ? { maxPoints: dto.maxPoints } : {}),
        ...(dto.isExtraCredit !== undefined ? { isExtraCredit: dto.isExtraCredit } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.dueDate !== undefined
          ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }
          : {}),
      },
    });
  }

  async remove(userId: string, assignmentId: string) {
    await this.assertAssignmentOwnership(userId, assignmentId);
    return this.prisma.assignment.delete({ where: { id: assignmentId } });
  }

  async updateOrder(userId: string, orderedIds: string[]) {
    if (!orderedIds.length) return { count: 0 };

    const assignments = await this.prisma.assignment.findMany({
      where: {
        id: { in: orderedIds },
        category: { course: { semester: { year: { userId } } } },
      },
      select: { id: true, category: { select: { courseId: true } } },
    });

    if (assignments.length !== orderedIds.length) {
      throw new ForbiddenException('Access denied');
    }

    const courseIds = new Set(assignments.map((a) => a.category.courseId));
    if (courseIds.size !== 1) {
      throw new BadRequestException('Assignments must belong to the same course');
    }

    const orderMap = new Map(orderedIds.map((id, index) => [id, index + 1]));
    await this.prisma.$transaction(
      assignments.map((assignment) =>
        this.prisma.assignment.update({
          where: { id: assignment.id },
          data: { sortOrder: orderMap.get(assignment.id) ?? 0 },
        }),
      ),
    );

    return { count: assignments.length };
  }
}
