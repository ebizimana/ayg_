import { UserTier } from '@prisma/client';

export const FREE_LIMITS = {
  years: 1,
  semesters: 1,
  courses: 3,
} as const;

export const isFreeTier = (tier: UserTier) => tier === UserTier.FREE;
