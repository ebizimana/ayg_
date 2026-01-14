import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EnableTargetGpaDto } from './dto/enable-target-gpa.dto';
import { DisableTargetGpaDto } from './dto/disable-target-gpa.dto';
import { TargetGpaScope } from '@prisma/client';

const gradePoints: Record<string, number> = {
  A: 4,
  B: 3,
  C: 2,
  D: 1,
  F: 0,
};

const gradeOrder = ['D', 'C', 'B', 'A'] as const;
const semesterSeasons = ['Fall', 'Spring', 'Summer', 'Winter'];
const yearLabels = ['Freshman', 'Sophomore', 'Junior', 'Senior'];

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
};

type ComputeResult = {
  assignments: Map<string, string>;
  maxAchievableGpa: number | null;
  gpaShortfall: number | null;
};

@Injectable()
export class TargetGpaService {
  constructor(private prisma: PrismaService) {}

  async getActiveSession(userId: string) {
    const session = await this.prisma.targetGpaSession.findFirst({
      where: { userId, disabledAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return session;
  }

  async enable(userId: string, dto: EnableTargetGpaDto) {
    const existing = await this.getActiveSession(userId);
    if (existing) {
      throw new BadRequestException('Target GPA already enabled.');
    }

    const scope = dto.scope as TargetGpaScope;
    if (scope === 'YEAR' && (dto.yearIndex === undefined || dto.yearIndex === null)) {
      throw new BadRequestException('Year index is required.');
    }
    if (scope === 'SEMESTER' && !dto.semesterId) {
      throw new BadRequestException('Semester is required.');
    }
    if (scope === 'CAREER' && (dto.yearIndex !== undefined || dto.semesterId)) {
      throw new BadRequestException('Career scope does not support year or semester filters.');
    }
    const { courses, semesters } = await this.getCoursesForScope(userId, scope, dto.yearIndex, dto.semesterId);
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
          yearIndex: dto.yearIndex ?? null,
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
    const session = await this.getActiveSession(userId);
    if (!session) return { disabled: false };

    if (dto?.scope && dto.scope !== session.scope) {
      throw new BadRequestException('Target GPA scope does not match.');
    }
    if (dto?.scope === 'YEAR' && dto.yearIndex !== undefined && dto.yearIndex !== session.yearIndex) {
      throw new BadRequestException('Target GPA year does not match.');
    }
    if (dto?.scope === 'SEMESTER' && dto.semesterId && dto.semesterId !== session.semesterId) {
      throw new BadRequestException('Target GPA semester does not match.');
    }

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
    const session = await this.getActiveSession(userId);
    if (!session) return;

    if (session.scope === 'SEMESTER' && session.semesterId && session.semesterId !== semesterId) {
      return;
    }

    if (session.scope === 'YEAR' && semesterId) {
      const semesters = await this.getSemestersForUser(userId);
      const yearIndex = this.getYearIndexForSemester(semesters, semesterId);
      if (yearIndex === null || yearIndex !== session.yearIndex) {
        return;
      }
    }

    const scope = session.scope as TargetGpaScope;
    const { courses } = await this.getCoursesForScope(userId, scope, session.yearIndex ?? undefined, session.semesterId ?? undefined);
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
    yearIndex?: number,
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

    const semesters = await this.getSemestersForUser(userId);
    if (scope === 'YEAR') {
      if (yearIndex === undefined || yearIndex === null) {
        throw new BadRequestException('Year index is required.');
      }
      const groups = this.groupSemesters(semesters);
      const group = groups[yearIndex];
      if (!group) throw new BadRequestException('Year not found.');
      const semesterIds = group.map((semester) => semester.id);
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
      where: { userId },
      orderBy: { startDate: 'asc' },
      select: { id: true, name: true, startDate: true },
    });
  }

  private async assertSemesterOwnership(userId: string, semesterId: string) {
    const semester = await this.prisma.semester.findFirst({
      where: { id: semesterId, userId },
      select: { id: true },
    });

    if (!semester) throw new NotFoundException('Semester not found');
  }

  private parseSemesterName(name: string) {
    const [maybeSeason] = name.split(' ');
    const season = semesterSeasons.includes(maybeSeason) ? maybeSeason : 'Fall';
    return { season };
  }

  private groupSemesters(semesters: SemesterData[]) {
    const groups: SemesterData[][] = [];
    let current: SemesterData[] = [];
    semesters.forEach((semester) => {
      const { season } = this.parseSemesterName(semester.name);
      if (season === 'Fall' && current.length > 0) {
        groups.push(current);
        current = [];
      }
      current.push(semester);
    });
    if (current.length) groups.push(current);
    if (groups.length > yearLabels.length) {
      const overflow = groups.slice(yearLabels.length - 1).flat();
      return [...groups.slice(0, yearLabels.length - 1), overflow];
    }
    return groups;
  }

  private getYearIndexForSemester(semesters: SemesterData[], semesterId: string) {
    const groups = this.groupSemesters(semesters);
    const index = groups.findIndex((group) => group.some((semester) => semester.id === semesterId));
    return index >= 0 ? index : null;
  }
}
