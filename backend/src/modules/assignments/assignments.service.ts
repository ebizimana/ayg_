import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
      where: { id: course.semesterId, userId },
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
    await this.assertCategoryOwnership(userId, categoryId);

    return this.prisma.assignment.create({
      data: {
        categoryId,
        name: dto.name,
        maxPoints: dto.maxPoints,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        isExtraCredit: dto.isExtraCredit ?? false,
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
    await this.assertAssignmentOwnership(userId, assignmentId);

    return this.prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.maxPoints !== undefined ? { maxPoints: dto.maxPoints } : {}),
        ...(dto.isExtraCredit !== undefined ? { isExtraCredit: dto.isExtraCredit } : {}),
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
}
