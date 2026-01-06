export type GradeLetter = 'A' | 'B' | 'C' | 'D' | 'F';

export type AssignmentInput = {
  id: string;
  name: string;
  maxPoints: number;
  isExtraCredit: boolean;
  isGraded: boolean;
  earnedPoints: number | null;
  expectedPoints: number | null;
};

export type CategoryInput = {
  id: string;
  name: string;
  weightPercent: number;
  dropLowest: number;
  assignments: AssignmentInput[];
};

export type CoursePlanInput = {
  id: string;
  name: string;
  desiredLetterGrade: GradeLetter;
  categories: CategoryInput[];
};

export type CategoryPlan = {
  id: string;
  name: string;
  weight: number; // normalized 0-1
  actualPercent: number | null;
  projectedPercent: number | null;
};

export type AssignmentRequirement = {
  id: string;
  name: string;
  maxPoints: number;
  requiredPoints: number;
};

export type CoursePlanResult = {
  targetPercent: number;
  actualPercent: number | null;
  projectedPercent: number | null;
  achievable: boolean;
  reason?: string;
  coveredWeight: number;
  remainingWeight: number;
  categories: CategoryPlan[];
  requirements: AssignmentRequirement[];
};
