import { Injectable } from '@nestjs/common';
import { UserTier } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FREE_LIMITS } from '../../common/tier/tier.constants';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  create(email: string, password: string) {
    return this.prisma.user.create({
      data: { email, password },
    });
  }

  async getTier(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });
    return user?.tier ?? UserTier.FREE;
  }

  async getUsage(userId: string) {
    const [years, semesters, courses] = await this.prisma.$transaction([
      this.prisma.year.count({ where: { userId } }),
      this.prisma.semester.count({ where: { year: { userId } } }),
      this.prisma.course.count({ where: { semester: { year: { userId } }, isDemo: false } }),
    ]);

    return { years, semesters, courses };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, tier: true, currentGpa: true },
    });
    if (!user) return null;
    const usage = await this.getUsage(userId);
    const limits = user.tier === UserTier.FREE ? FREE_LIMITS : { years: null, semesters: null, courses: null };
    return { ...user, usage, limits };
  }

  async updateCurrentGpa(userId: string, currentGpa: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { currentGpa },
      select: { id: true, email: true, tier: true, currentGpa: true },
    });
  }

  async updateTier(userId: string, tier: UserTier) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { tier },
      select: { id: true, email: true, tier: true },
    });
  }

  async deleteAccount(userId: string) {
    return this.prisma.user.delete({
      where: { id: userId },
      select: { id: true },
    });
  }
}
