import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';

@Injectable()
export class GradesService {
  constructor(private readonly prisma: PrismaService) {}

  private isGradedFlag(grade: { expectedPoints?: number | null; earnedPoints?: number | null; gradedAt?: Date | null }) {
    const { expectedPoints, earnedPoints, gradedAt } = grade;
    return [expectedPoints, earnedPoints, gradedAt].some((v) => v !== null && v !== undefined);
  }

  private async getOwnedAssignmentOrThrow(assignmentId: string, userId: string) {
    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        category: { course: { semester: { userId } } },
      },
      select: { id: true, maxPoints: true, isExtraCredit: true },
    });

    if (!assignment) throw new ForbiddenException('You do not have access to this assignment');
    return assignment;
  }

  private validateAgainstMaxPoints(
    maxPoints: number,
    isExtraCredit: boolean,
    expectedPoints?: number,
    earnedPoints?: number,
  ) {
    const check = (label: string, v?: number) => {
      if (v === undefined || v === null) return;
      if (v < 0) throw new BadRequestException(`${label} cannot be negative`);
      if (!isExtraCredit && v > maxPoints) {
        throw new BadRequestException(`${label} cannot exceed maxPoints (${maxPoints})`);
      }
    };

    check('expectedPoints', expectedPoints);
    check('earnedPoints', earnedPoints);
  }

  // CREATE (fails if grade already exists)
  async create(assignmentId: string, userId: string, dto: CreateGradeDto) {
    const assignment = await this.getOwnedAssignmentOrThrow(assignmentId, userId);

    this.validateAgainstMaxPoints(
      assignment.maxPoints,
      assignment.isExtraCredit,
      dto.expectedPoints,
      dto.earnedPoints,
    );

    const existing = await this.prisma.grade.findUnique({ where: { assignmentId } });
    if (existing) throw new ConflictException('Grade already exists for this assignment');

    const grade = await this.prisma.grade.create({
      data: {
        assignmentId,
        expectedPoints: dto.expectedPoints,
        earnedPoints: dto.earnedPoints,
        gradedAt: dto.gradedAt ? new Date(dto.gradedAt) : undefined,
        notes: dto.notes,
      },
    });

    await this.prisma.assignment.update({
      where: { id: assignment.id },
      data: { isGraded: this.isGradedFlag(grade) },
    });

    return grade;
  }

  // READ (returns null if grade doesn't exist yet)
  async getByAssignment(assignmentId: string, userId: string) {
    await this.getOwnedAssignmentOrThrow(assignmentId, userId);
    return this.prisma.grade.findUnique({ where: { assignmentId } });
  }

  // UPDATE (requires grade exists)
  async updateByAssignment(assignmentId: string, userId: string, dto: UpdateGradeDto) {
    const assignment = await this.getOwnedAssignmentOrThrow(assignmentId, userId);

    const existing = await this.prisma.grade.findUnique({ where: { assignmentId } });
    if (!existing) throw new NotFoundException('Grade not found for this assignment');

    const expectedNext = dto.expectedPoints ?? existing.expectedPoints ?? undefined;
    const earnedNext = dto.earnedPoints ?? existing.earnedPoints ?? undefined;

    this.validateAgainstMaxPoints(
      assignment.maxPoints,
      assignment.isExtraCredit,
      expectedNext,
      earnedNext,
    );

    const grade = await this.prisma.grade.update({
      where: { assignmentId },
      data: {
        expectedPoints: dto.expectedPoints,
        earnedPoints: dto.earnedPoints,
        gradedAt: dto.gradedAt !== undefined ? new Date(dto.gradedAt) : undefined,
        notes: dto.notes,
      },
    });

    await this.prisma.assignment.update({
      where: { id: assignmentId },
      data: { isGraded: this.isGradedFlag(grade) },
    });

    return grade;
  }

  // DELETE
  async removeByAssignment(assignmentId: string, userId: string) {
    await this.getOwnedAssignmentOrThrow(assignmentId, userId);

    const existing = await this.prisma.grade.findUnique({ where: { assignmentId } });
    if (!existing) throw new NotFoundException('Grade not found for this assignment');

    const deleted = await this.prisma.grade.delete({ where: { assignmentId } });

    await this.prisma.assignment.update({
      where: { id: assignmentId },
      data: { isGraded: false },
    });

    return deleted;
  }

  // UPSERT (recommended: set expected/earned whenever, creates grade if missing)
  async upsertByAssignment(assignmentId: string, userId: string, dto: UpdateGradeDto) {
    const assignment = await this.getOwnedAssignmentOrThrow(assignmentId, userId);

    this.validateAgainstMaxPoints(
      assignment.maxPoints,
      assignment.isExtraCredit,
      dto.expectedPoints,
      dto.earnedPoints,
    );

    const grade = await this.prisma.grade.upsert({
      where: { assignmentId },
      create: {
        assignmentId,
        expectedPoints: dto.expectedPoints,
        earnedPoints: dto.earnedPoints,
        gradedAt: dto.gradedAt ? new Date(dto.gradedAt) : undefined,
        notes: dto.notes,
      },
      update: {
        expectedPoints: dto.expectedPoints,
        earnedPoints: dto.earnedPoints,
        gradedAt: dto.gradedAt !== undefined ? new Date(dto.gradedAt) : undefined,
        notes: dto.notes,
      },
    });

    await this.prisma.assignment.update({
      where: { id: assignmentId },
      data: { isGraded: this.isGradedFlag(grade) },
    });

    return grade;
  }
}
