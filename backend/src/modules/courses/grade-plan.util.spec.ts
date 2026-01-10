import { computeCoursePlan } from './grade-plan.util';
import { CoursePlanInput } from './grade-plan.types';

const baseCourse = (): CoursePlanInput => ({
  id: 'course1',
  name: 'Test',
  desiredLetterGrade: 'A',
  gradingMethod: 'WEIGHTED',
  categories: [
    {
      id: 'cat1',
      name: 'Main',
      weightPercent: 100,
      dropLowest: 0,
      assignments: [],
    },
  ],
});

describe('computeCoursePlan', () => {
  it('distributes required points across ungraded assignments', () => {
    const input = baseCourse();
    input.categories[0].assignments = [
      { id: 'a1', name: 'A1', maxPoints: 100, isExtraCredit: false, isGraded: false, earnedPoints: null, expectedPoints: null },
      { id: 'a2', name: 'A2', maxPoints: 100, isExtraCredit: false, isGraded: false, earnedPoints: null, expectedPoints: null },
    ];

    const result = computeCoursePlan(input);
    const reqs = result.requirements.reduce((map, r) => ({ ...map, [r.id]: r.requiredPoints }), {} as Record<string, number>);
    expect(result.achievable).toBe(true);
    expect(reqs.a1).toBeCloseTo(90, 2);
    expect(reqs.a2).toBeCloseTo(90, 2);
  });

  it('marks unattainable when required exceeds remaining max', () => {
    const input = baseCourse();
    input.categories[0].assignments = [
      { id: 'a1', name: 'A1', maxPoints: 100, isExtraCredit: false, isGraded: true, earnedPoints: 50, expectedPoints: null },
      { id: 'a2', name: 'A2', maxPoints: 100, isExtraCredit: false, isGraded: false, earnedPoints: null, expectedPoints: null },
    ];

    const result = computeCoursePlan(input);
    expect(result.achievable).toBe(false);
  });

  it('handles over-achievement and lowers remaining requirement', () => {
    const input = baseCourse();
    input.categories[0].assignments = [
      { id: 'a1', name: 'A1', maxPoints: 100, isExtraCredit: false, isGraded: true, earnedPoints: 100, expectedPoints: null },
      { id: 'a2', name: 'A2', maxPoints: 100, isExtraCredit: false, isGraded: false, earnedPoints: null, expectedPoints: null },
    ];

    const result = computeCoursePlan(input);
    expect(result.requirements[0].requiredPoints).toBeLessThanOrEqual(80);
  });

  it('applies dropLowest to projected and ignores dropped for requirements', () => {
    const input = baseCourse();
    input.categories[0].dropLowest = 1;
    input.categories[0].assignments = [
      { id: 'a1', name: 'A1', maxPoints: 50, isExtraCredit: false, isGraded: false, earnedPoints: null, expectedPoints: 40 },
      { id: 'a2', name: 'A2', maxPoints: 100, isExtraCredit: false, isGraded: false, earnedPoints: null, expectedPoints: 100 },
    ];

    const result = computeCoursePlan(input);
    // Requirements distribute across all remaining assignments.
    expect(result.requirements).toHaveLength(2);
    const reqs = result.requirements.reduce((map, r) => ({ ...map, [r.id]: r.requiredPoints }), {} as Record<string, number>);
    expect(reqs.a1).toBeGreaterThan(0);
    expect(reqs.a2).toBeGreaterThan(0);
    expect(result.droppedAssignmentIds).toHaveLength(1);
  });

  it('drops smaller maxPoints first when percentages tie', () => {
    const input = baseCourse();
    input.categories[0].dropLowest = 1;
    input.categories[0].assignments = [
      { id: 'a1', name: 'A1', maxPoints: 45, isExtraCredit: false, isGraded: true, earnedPoints: 45, expectedPoints: null },
      { id: 'a2', name: 'A2', maxPoints: 50, isExtraCredit: false, isGraded: true, earnedPoints: 50, expectedPoints: null },
    ];

    const result = computeCoursePlan(input);
    expect(result.droppedAssignmentIds).toEqual(['a1']);
  });

  it('uses total points for actual percent in points-based mode', () => {
    const input = baseCourse();
    input.gradingMethod = 'POINTS';
    input.categories = [
      {
        id: 'cat1',
        name: 'LowWeight',
        weightPercent: 10,
        dropLowest: 0,
        assignments: [
          { id: 'a1', name: 'A1', maxPoints: 100, isExtraCredit: false, isGraded: true, earnedPoints: 50, expectedPoints: null },
        ],
      },
      {
        id: 'cat2',
        name: 'HighWeight',
        weightPercent: 90,
        dropLowest: 0,
        assignments: [
          { id: 'a2', name: 'A2', maxPoints: 100, isExtraCredit: false, isGraded: true, earnedPoints: 100, expectedPoints: null },
        ],
      },
    ];

    const result = computeCoursePlan(input);
    expect(result.actualPercent).toBeCloseTo(0.75, 2);
  });
});
