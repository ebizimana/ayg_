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
  dropEligible?: boolean;
};

function applyDrops(assignments: ScoredAssignment[], dropLowest: number): DropResult<ScoredAssignment> {
  if (dropLowest <= 0 || assignments.length === 0) {
    return { kept: assignments, dropped: [] };
  }

  const eligible = assignments.filter((a) => a.dropEligible !== false);
  if (eligible.length === 0) {
    return { kept: assignments, dropped: [] };
  }

  const sortedEligible = [...eligible].sort((a, b) => {
    const ratioDiff = a.score / a.maxPoints - b.score / b.maxPoints;
    if (ratioDiff !== 0) return ratioDiff;
    return a.maxPoints - b.maxPoints;
  });
  const droppedEligible = sortedEligible.slice(0, dropLowest);
  const droppedIds = new Set(droppedEligible.map((a) => a.id));
  const kept = assignments.filter((a) => !droppedIds.has(a.id));
  const dropped = assignments.filter((a) => droppedIds.has(a.id));
  return { kept, dropped };
}

function clampEarned(assignment: ScoredAssignment) {
  if (assignment.isExtraCredit) return assignment.score;
  return Math.min(assignment.score, assignment.maxPoints);
}

export function computeCoursePlan(input: CoursePlanInput): CoursePlanResult {
  const targetPercent = LETTER_TO_PERCENT[input.desiredLetterGrade] ?? 0.9;
  const isPointsBased = input.gradingMethod === 'POINTS';
  const totalWeight = isPointsBased
    ? 1
    : input.categories.reduce((sum, c) => sum + Math.max(c.weightPercent, 0), 0) || 1;

  let achievable = true;
  let reason: string | undefined;
  const categoryPlans: CategoryPlan[] = [];
  const requirements: AssignmentRequirement[] = [];
  const droppedAssignmentIds: string[] = [];
  let weightedActual = 0;
  let weightedProjected = 0;
  let coveredWeight = 0;
  let pointsEarnedForActual = 0;
  let pointsMaxForActual = 0;
  let pointsEarnedForProjected = 0;
  let pointsMaxForProjected = 0;
  const pointBasedRemaining: typeof input.categories[0]['assignments'] = [];
  const pointBasedEarnedKept: ScoredAssignment[] = [];
  const pointBasedKept: ScoredAssignment[] = [];
  const pointBasedKeptMaxByCategory = new Map<string, number>();

  const maxPointsSum = (items: ScoredAssignment[], includeExtraCredit: boolean) =>
    items.reduce((sum, item) => sum + (includeExtraCredit || !item.isExtraCredit ? item.maxPoints : 0), 0);

  for (const category of input.categories) {
    const weight = Math.max(category.weightPercent, 0) / totalWeight;

    const graded = category.assignments.filter((a) => a.earnedPoints !== null);
    const ungraded = category.assignments.filter((a) => a.earnedPoints === null);

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
      score: a.earnedPoints !== null
        ? (a.earnedPoints ?? 0)
        : (a.expectedPoints ?? a.maxPoints), // optimistic default for projection
      dropEligible: a.earnedPoints !== null || a.expectedPoints !== null,
    }));
    const projectedDrop = applyDrops(projectedAssignments, category.dropLowest);
    droppedAssignmentIds.push(...projectedDrop.dropped.map((a) => a.id));
    const projectedEarned = projectedDrop.kept.reduce((s, a) => s + clampEarned(a), 0);
    const projectedMax = projectedDrop.kept.reduce((s, a) => s + a.maxPoints, 0);
    const projectedPercent = projectedMax > 0 ? projectedEarned / projectedMax : null;

    if (isPointsBased) {
      pointBasedKept.push(...projectedDrop.kept);
      pointBasedEarnedKept.push(...projectedDrop.kept.filter((a) => graded.some((g) => g.id === a.id)));
      pointBasedRemaining.push(...ungraded);
      pointsEarnedForActual += actualEarned;
      pointsMaxForActual += maxPointsSum(actualDrop.kept, false);
      pointsEarnedForProjected += projectedEarned;
      pointsMaxForProjected += maxPointsSum(projectedDrop.kept, false);
      pointBasedKeptMaxByCategory.set(category.id, maxPointsSum(projectedDrop.kept, false));
    } else {
      // Requirements for remaining assignments in this category to hit targetPercent within the kept set
      // Distribute across all remaining assignments so every upcoming item shows a requirement.
      const remaining = category.assignments.filter((a) => a.earnedPoints === null);
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
          requirements.push({ id: a.id, name: a.name, maxPoints: a.maxPoints, requiredPoints: Math.round(req) });
        }
      } else if (neededPoints > 0) {
        achievable = false;
        reason = reason ?? 'No remaining assignments to cover the target.';
      }
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
      weight: weight,
      actualPercent,
      projectedPercent,
    };
    categoryPlans.push(catPlan);
  }

  let actualPercent: number | null = coveredWeight > 0 ? weightedActual / coveredWeight : null;
  let projectedPercent: number | null = weightedProjected;
  let remainingWeight = 1 - coveredWeight;

  if (isPointsBased) {
    const totalKeptMax = Array.from(pointBasedKeptMaxByCategory.values()).reduce((sum, value) => sum + value, 0);
    if (totalKeptMax > 0) {
      for (const catPlan of categoryPlans) {
        const catMax = pointBasedKeptMaxByCategory.get(catPlan.id) ?? 0;
        catPlan.weight = catMax / totalKeptMax;
      }
    } else {
      for (const catPlan of categoryPlans) {
        catPlan.weight = 0;
      }
    }
    const actualMax = pointsMaxForActual;
    const projectedMax = pointsMaxForProjected;
    actualPercent = actualMax > 0 ? pointsEarnedForActual / actualMax : null;
    projectedPercent = projectedMax > 0 ? pointsEarnedForProjected / projectedMax : null;
    coveredWeight = actualMax > 0 ? 1 : 0;
    remainingWeight = 0;

    const targetPoints = targetPercent * projectedMax;
    const earnedForReq = pointBasedEarnedKept.reduce((s, a) => s + clampEarned(a), 0);
    const neededPoints = Math.max(0, targetPoints - earnedForReq);
    const remainingMax = pointBasedRemaining.reduce(
      (s, a) => s + (a.isExtraCredit ? 0 : a.maxPoints),
      0,
    );

    if (pointBasedRemaining.length > 0 && (remainingMax > 0 || pointBasedRemaining.some((r) => r.isExtraCredit))) {
      if (neededPoints > remainingMax && !pointBasedRemaining.some((r) => r.isExtraCredit)) {
        achievable = false;
        reason = reason ?? 'Target grade unattainable with remaining max points.';
      }
      const scale = remainingMax > 0 ? neededPoints / remainingMax : 0;
      for (const a of pointBasedRemaining) {
        const req = a.isExtraCredit ? 0 : Math.min(a.maxPoints, a.maxPoints * scale);
        requirements.push({ id: a.id, name: a.name, maxPoints: a.maxPoints, requiredPoints: Math.round(req) });
      }
    } else if (neededPoints > 0) {
      achievable = false;
      reason = reason ?? 'No remaining assignments to cover the target.';
    }
  }

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
    droppedAssignmentIds,
  };
}
