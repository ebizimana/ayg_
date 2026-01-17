import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EnableTargetGpaDto } from './dto/enable-target-gpa.dto';
import { DisableTargetGpaDto } from './dto/disable-target-gpa.dto';
import { TargetGpaScope, type TargetGpaSession } from '@prisma/client';

const gradePoints: Record<string, number> = {
  A: 4,
  B: 3,
  C: 2,
  D: 1,
  F: 0,
};

const gradeOrder = ['D', 'C', 'B', 'A'] as const;
type CourseData = {
  id: string;
  credits: number;
  desiredLetterGrade: string;
  actualLetterGrade: string | null;
  isCompleted: boolean;
  semesterId: string;
};

type SemesterData = {
  id: string;
  name: string;
  startDate: Date;
  yearId: string;
};

type ComputeResult = {
  assignments: Map<string, string>;
  maxAchievableGpa: number | null;
  gpaShortfall: number | null;
};

@Injectable()
export class TargetGpaService {
  constructor(private prisma: PrismaService) {}

  async getActiveSessions(userId: string) {
    return this.prisma.targetGpaSession.findMany({
      where: { userId, disabledAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async hasActiveCareerTarget(userId: string) {
    const session = await this.getActiveCareerSession(userId);
    return !!session;
  }

  async hasActiveYearTarget(userId: string, yearId: string) {
    const session = await this.getActiveYearSession(userId, yearId);
    return !!session;
  }

  async hasActiveSemesterTarget(userId: string, semesterId: string) {
    const session = await this.getActiveSemesterSession(userId, semesterId);
    return !!session;
  }

  async isTargetActiveForSemester(userId: string, semesterId: string) {
    const career = await this.getActiveCareerSession(userId);
    if (career) return true;
    const semester = await this.prisma.semester.findFirst({
      where: { id: semesterId, year: { userId } },
      select: { yearId: true },
    });
    if (!semester) return false;
    const yearTarget = await this.getActiveYearSession(userId, semester.yearId);
    if (yearTarget) return true;
    const semesterTarget = await this.getActiveSemesterSession(userId, semesterId);
    return !!semesterTarget;
  }

  private async getActiveCareerSession(userId: string) {
    return this.prisma.targetGpaSession.findFirst({
      where: { userId, disabledAt: null, scope: 'CAREER' },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async getActiveYearSession(userId: string, yearId: string) {
    return this.prisma.targetGpaSession.findFirst({
      where: { userId, disabledAt: null, scope: 'YEAR', yearId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async getActiveSemesterSession(userId: string, semesterId: string) {
    return this.prisma.targetGpaSession.findFirst({
      where: { userId, disabledAt: null, scope: 'SEMESTER', semesterId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async getActiveSemesterSessionsForYear(userId: string, yearId: string) {
    return this.prisma.targetGpaSession.findMany({
      where: {
        userId,
        disabledAt: null,
        scope: 'SEMESTER',
        semester: { yearId },
      },
    });
  }

  async enable(userId: string, dto: EnableTargetGpaDto) {
    const scope = dto.scope as TargetGpaScope;
    const activeCareer = await this.getActiveCareerSession(userId);

    if (scope === 'YEAR' && !dto.yearId) {
      throw new BadRequestException('Year is required.');
    }
    if (scope === 'SEMESTER' && !dto.semesterId) {
      throw new BadRequestException('Semester is required.');
    }
    if (scope === 'CAREER' && (dto.yearId || dto.semesterId)) {
      throw new BadRequestException('Career scope does not support year or semester filters.');
    }

    if (scope === 'CAREER') {
      const existing = await this.getActiveSessions(userId);
      if (existing.length) {
        throw new BadRequestException('Disable all active targets before enabling Career GPA.');
      }
    }

    if (scope === 'YEAR') {
      if (activeCareer) {
        throw new BadRequestException('Disable Career GPA before enabling a Year target.');
      }
      const existingYear = await this.getActiveYearSession(userId, dto.yearId!);
      if (existingYear) {
        throw new BadRequestException('Target GPA already enabled for this year.');
      }
      const semesterConflicts = await this.getActiveSemesterSessionsForYear(userId, dto.yearId!);
      if (semesterConflicts.length) {
        throw new BadRequestException('Disable all semester targets in this year before enabling a Year target.');
      }
    }

    if (scope === 'SEMESTER') {
      if (activeCareer) {
        throw new BadRequestException('Disable Career GPA before enabling a Semester target.');
      }
      const existingSemester = await this.getActiveSemesterSession(userId, dto.semesterId!);
      if (existingSemester) {
        throw new BadRequestException('Target GPA already enabled for this semester.');
      }
      const semester = await this.prisma.semester.findFirst({
        where: { id: dto.semesterId!, year: { userId } },
        select: { yearId: true },
      });
      if (!semester) throw new BadRequestException('Semester not found.');
      const yearSession = await this.getActiveYearSession(userId, semester.yearId);
      if (yearSession) {
        throw new BadRequestException('Disable the Year target before enabling a Semester target in this year.');
      }
    }
    const { courses, semesters } = await this.getCoursesForScope(userId, scope, dto.yearId, dto.semesterId);
    if (!courses.length) {
      throw new BadRequestException('No courses available for this scope.');
    }

    const compute = this.computeAssignments(courses, dto.targetGpa);
    const snapshotData = courses.map((course) => ({
      courseId: course.id,
      previousDesiredLetterGrade: course.desiredLetterGrade,
    }));

    return this.prisma.$transaction(async (tx) => {
      const session = await tx.targetGpaSession.create({
        data: {
          userId,
          scope,
          targetGpa: dto.targetGpa,
          yearId: dto.yearId ?? null,
          semesterId: dto.semesterId ?? null,
          maxAchievableGpa: compute.maxAchievableGpa,
          gpaShortfall: compute.gpaShortfall,
        },
      });

      if (snapshotData.length) {
        await tx.targetGpaSnapshot.createMany({
          data: snapshotData.map((entry) => ({ ...entry, sessionId: session.id })),
        });
      }

      const updates = courses
        .filter((course) => !course.isCompleted)
        .map((course) =>
          tx.course.update({
            where: { id: course.id },
            data: { desiredLetterGrade: compute.assignments.get(course.id) ?? course.desiredLetterGrade },
          }),
        );
      await Promise.all(updates);

      return {
        ...session,
        maxAchievableGpa: compute.maxAchievableGpa,
        gpaShortfall: compute.gpaShortfall,
        scope,
        semesters,
      };
    });
  }

  async disable(userId: string, dto?: DisableTargetGpaDto) {
    if (!dto?.scope) {
      throw new BadRequestException('Target GPA scope is required.');
    }

    let session: TargetGpaSession | null = null;
    if (dto.scope === 'CAREER') {
      session = await this.getActiveCareerSession(userId);
    } else if (dto.scope === 'YEAR') {
      if (!dto.yearId) throw new BadRequestException('Year is required.');
      session = await this.getActiveYearSession(userId, dto.yearId);
    } else if (dto.scope === 'SEMESTER') {
      if (!dto.semesterId) throw new BadRequestException('Semester is required.');
      session = await this.getActiveSemesterSession(userId, dto.semesterId);
    }

    if (!session) return { disabled: false };

    return this.prisma.$transaction(async (tx) => {
      const snapshots = await tx.targetGpaSnapshot.findMany({
        where: { sessionId: session.id },
      });

      await Promise.all(
        snapshots.map((entry) =>
          tx.course.update({
            where: { id: entry.courseId },
            data: { desiredLetterGrade: entry.previousDesiredLetterGrade },
          }),
        ),
      );

      await tx.targetGpaSession.update({
        where: { id: session.id },
        data: { disabledAt: new Date() },
      });

      return { disabled: true };
    });
  }

  async recomputeForCourseChange(userId: string, semesterId: string | null) {
    const activeCareer = await this.getActiveCareerSession(userId);
    if (activeCareer) {
      await this.recomputeSession(userId, activeCareer);
      return;
    }

    if (!semesterId) return;
    const semester = await this.prisma.semester.findFirst({
      where: { id: semesterId, year: { userId } },
      select: { yearId: true },
    });
    if (!semester) return;

    const activeYear = await this.getActiveYearSession(userId, semester.yearId);
    if (activeYear) {
      await this.recomputeSession(userId, activeYear);
      return;
    }

    const activeSemester = await this.getActiveSemesterSession(userId, semesterId);
    if (activeSemester) {
      await this.recomputeSession(userId, activeSemester);
    }
  }

  private async recomputeSession(userId: string, session: { id: string; scope: TargetGpaScope; yearId: string | null; semesterId: string | null; targetGpa: number; }) {
    const { courses } = await this.getCoursesForScope(
      userId,
      session.scope,
      session.yearId ?? undefined,
      session.semesterId ?? undefined,
    );
    if (!courses.length) return;

    const compute = this.computeAssignments(courses, session.targetGpa);

    await this.prisma.$transaction(async (tx) => {
      const updates = courses
        .filter((course) => !course.isCompleted)
        .map((course) =>
          tx.course.update({
            where: { id: course.id },
            data: { desiredLetterGrade: compute.assignments.get(course.id) ?? course.desiredLetterGrade },
          }),
        );
      await Promise.all(updates);

      await tx.targetGpaSession.update({
        where: { id: session.id },
        data: {
          maxAchievableGpa: compute.maxAchievableGpa,
          gpaShortfall: compute.gpaShortfall,
        },
      });
    });
  }

  private computeAssignments(courses: CourseData[], targetGpa: number): ComputeResult {
    const totalCredits = courses.reduce((sum, course) => sum + (course.credits ?? 0), 0);
    if (!totalCredits) {
      return { assignments: new Map(), maxAchievableGpa: null, gpaShortfall: null };
    }

    const lockedCourses = courses.filter((course) => course.isCompleted);
    const eligibleCourses = courses.filter((course) => !course.isCompleted);

    const lockedPoints = lockedCourses.reduce((sum, course) => {
      const points = gradePoints[course.actualLetterGrade ?? 'F'] ?? 0;
      return sum + points * course.credits;
    }, 0);

    const assignments = new Map<string, string>();
    let currentPoints = lockedPoints;

    eligibleCourses.forEach((course) => {
      assignments.set(course.id, 'D');
      currentPoints += gradePoints.D * course.credits;
    });

    const requiredPoints = targetGpa * totalCredits;
    let deficit = requiredPoints - currentPoints;

    const sorted = [...eligibleCourses].sort((a, b) => b.credits - a.credits);

    if (deficit > 0) {
      for (const course of sorted) {
        let gradeIndex = 0;
        while (gradeIndex < gradeOrder.length - 1 && deficit > 0) {
          const currentGrade = gradeOrder[gradeIndex];
          const nextGrade = gradeOrder[gradeIndex + 1];
          assignments.set(course.id, nextGrade);
          deficit -= (gradePoints[nextGrade] - gradePoints[currentGrade]) * course.credits;
          gradeIndex += 1;
        }
      }
    }

    let maxAchievableGpa: number | null = null;
    let gpaShortfall: number | null = null;

    if (deficit > 0) {
      const maxPoints =
        lockedPoints + eligibleCourses.reduce((sum, course) => sum + gradePoints.A * course.credits, 0);
      maxAchievableGpa = maxPoints / totalCredits;
      gpaShortfall = Math.max(targetGpa - maxAchievableGpa, 0);
      eligibleCourses.forEach((course) => assignments.set(course.id, 'A'));
    }

    return { assignments, maxAchievableGpa, gpaShortfall };
  }

  private async getCoursesForScope(
    userId: string,
    scope: TargetGpaScope,
    yearId?: string,
    semesterId?: string,
  ) {
    if (scope === 'SEMESTER') {
      if (!semesterId) throw new BadRequestException('Semester is required.');
      await this.assertSemesterOwnership(userId, semesterId);
      const courses = await this.prisma.course.findMany({
        where: { semesterId },
        select: {
          id: true,
          credits: true,
          desiredLetterGrade: true,
          actualLetterGrade: true,
          isCompleted: true,
          semesterId: true,
        },
      });
      return { courses, semesters: [semesterId] };
    }

    if (scope === 'YEAR') {
      if (!yearId) {
        throw new BadRequestException('Year is required.');
      }
      await this.assertYearOwnership(userId, yearId);
      const semesterIds = await this.prisma.semester
        .findMany({
          where: { yearId },
          select: { id: true },
        })
        .then((rows) => rows.map((row) => row.id));
      const courses = await this.prisma.course.findMany({
        where: { semesterId: { in: semesterIds } },
        select: {
          id: true,
          credits: true,
          desiredLetterGrade: true,
          actualLetterGrade: true,
          isCompleted: true,
          semesterId: true,
        },
      });
      return { courses, semesters: semesterIds };
    }

    const semesters = await this.getSemestersForUser(userId);
    const semesterIds = semesters.map((semester) => semester.id);
    const courses = await this.prisma.course.findMany({
      where: { semesterId: { in: semesterIds } },
      select: {
        id: true,
        credits: true,
        desiredLetterGrade: true,
        actualLetterGrade: true,
        isCompleted: true,
        semesterId: true,
      },
    });
    return { courses, semesters: semesterIds };
  }

  private async getSemestersForUser(userId: string): Promise<SemesterData[]> {
    return this.prisma.semester.findMany({
      where: { year: { userId } },
      orderBy: { startDate: 'asc' },
      select: { id: true, name: true, startDate: true, yearId: true },
    });
  }

  private async assertYearOwnership(userId: string, yearId: string) {
    const year = await this.prisma.year.findFirst({
      where: { id: yearId, userId },
      select: { id: true },
    });

    if (!year) throw new NotFoundException('Year not found');
  }

  private async assertSemesterOwnership(userId: string, semesterId: string) {
    const semester = await this.prisma.semester.findFirst({
      where: { id: semesterId, year: { userId } },
      select: { id: true },
    });

    if (!semester) throw new NotFoundException('Semester not found');
  }
}
