export class UpdateCourseDto {
  name?: string;
  credits?: number;
  desiredLetterGrade?: string;
  gradingScaleId?: string | null;
  actualLetterGrade?: string | null;
  actualPercentGrade?: number | null;
  gradeFinalizedAt?: string | null; // ISO string

}
