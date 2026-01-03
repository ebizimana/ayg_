import { CoursePlanInput, CoursePlanResult, GradeLetter, CategoryPlan, AssignmentRequirement } from './grade-plan.types';

const LETTER_TO_PERCENT: Record<GradeLetter, number> = {
  A: 0.9,
  B: 0.8,
  C: 0.7,
  D: 0.6,
  F: 0,
};

type DropResult<T> = {
  kept: T[];
  dropped: T[];
};

type ScoredAssignment = {
  id: string;
  name: string;
  maxPoints: number;
  isExtraCredit: boolean;
  score: number;
};

function applyDrops(assignments: ScoredAssignment[], dropLowest: number): DropResult<ScoredAssignment> {
  if (dropLowest <= 0 || assignments.length === 0) {
    return { kept: assignments, dropped: [] };
  }

  const sorted = [...assignments].sort((a, b) => a.score / a.maxPoints - b.score / b.maxPoints);
  const dropped = sorted.slice(0, dropLowest);
  const kept = sorted.slice(dropLowest);
  return { kept, dropped };
}

function clampEarned(assignment: ScoredAssignment) {
  if (assignment.isExtraCredit) return assignment.score;
  return Math.min(assignment.score, assignment.maxPoints);
}

export function computeCoursePlan(input: CoursePlanInput): CoursePlanResult {
  const targetPercent = LETTER_TO_PERCENT[input.desiredLetterGrade] ?? 0.9;
  const totalWeight = input.categories.reduce((sum, c) => sum + Math.max(c.weightPercent, 0), 0) || 1;

  let achievable = true;
  let reason: string | undefined;
  const categoryPlans: CategoryPlan[] = [];
  const requirements: AssignmentRequirement[] = [];
  let weightedActual = 0;
  let weightedProjected = 0;
  let coveredWeight = 0;

  for (const category of input.categories) {
    const weight = Math.max(category.weightPercent, 0) / totalWeight;

    const graded = category.assignments.filter((a) => a.isGraded && a.earnedPoints !== null);
    const ungraded = category.assignments.filter((a) => !a.isGraded);

    // Actual percent (graded only, apply drops on graded)
    const gradedScores: ScoredAssignment[] = graded.map((a) => ({
      id: a.id,
      name: a.name,
      maxPoints: a.maxPoints,
      isExtraCredit: a.isExtraCredit,
      score: a.earnedPoints ?? 0,
    }));
    const actualDrop = applyDrops(gradedScores, category.dropLowest);
    const actualEarned = actualDrop.kept.reduce((s, a) => s + clampEarned(a), 0);
    const actualMax = actualDrop.kept.reduce((s, a) => s + a.maxPoints, 0);
    const actualPercent = actualMax > 0 ? actualEarned / actualMax : null;

    // Projected percent (use earned for graded, expected or max for ungraded)
    const projectedAssignments: ScoredAssignment[] = category.assignments.map((a) => ({
      id: a.id,
      name: a.name,
      maxPoints: a.maxPoints,
      isExtraCredit: a.isExtraCredit,
      score: a.isGraded
        ? (a.earnedPoints ?? 0)
        : (a.expectedPoints ?? a.maxPoints), // optimistic default for projection
    }));
    const projectedDrop = applyDrops(projectedAssignments, category.dropLowest);
    const projectedEarned = projectedDrop.kept.reduce((s, a) => s + clampEarned(a), 0);
    const projectedMax = projectedDrop.kept.reduce((s, a) => s + a.maxPoints, 0);
    const projectedPercent = projectedMax > 0 ? projectedEarned / projectedMax : null;

    // Requirements for remaining assignments in this category to hit targetPercent within the kept set
    const keptIds = new Set(projectedDrop.kept.map((a) => a.id));
    const remaining = category.assignments.filter((a) => !a.isGraded && keptIds.has(a.id));
    const keptMax = projectedDrop.kept.reduce((s, a) => s + a.maxPoints, 0);
    const earnedForReq = projectedDrop.kept
      .filter((a) => graded.some((g) => g.id === a.id))
      .reduce((s, a) => s + clampEarned(a), 0);

    const targetPoints = targetPercent * keptMax;
    const neededPoints = Math.max(0, targetPoints - earnedForReq);
    const remainingMax = remaining.reduce((s, a) => s + a.maxPoints, 0);

    if (remaining.length > 0 && remainingMax > 0) {
      if (neededPoints > remainingMax && !remaining.some((r) => r.isExtraCredit)) {
        achievable = false;
        reason = reason ?? 'Target grade unattainable with remaining max points.';
      }
      const scale = remainingMax > 0 ? neededPoints / remainingMax : 0;
      for (const a of remaining) {
        const req = Math.min(a.maxPoints, a.maxPoints * scale);
        requirements.push({ id: a.id, name: a.name, maxPoints: a.maxPoints, requiredPoints: Number(req.toFixed(2)) });
      }
    } else if (neededPoints > 0) {
      achievable = false;
      reason = reason ?? 'No remaining assignments to cover the target.';
    }

    if (actualPercent !== null) {
      weightedActual += weight * actualPercent;
      coveredWeight += weight;
    }
    if (projectedPercent !== null) {
      weightedProjected += weight * projectedPercent;
    }

    const catPlan: CategoryPlan = {
      id: category.id,
      name: category.name,
      weight,
      actualPercent,
      projectedPercent,
    };
    categoryPlans.push(catPlan);
  }

  const actualPercent = coveredWeight > 0 ? weightedActual / coveredWeight : null;
  const projectedPercent = weightedProjected;
  const remainingWeight = 1 - coveredWeight;

  return {
    targetPercent,
    actualPercent,
    projectedPercent,
    achievable,
    reason,
    coveredWeight,
    remainingWeight,
    categories: categoryPlans,
    requirements,
  };
}
