export class CreateCourseDto {
  name!: string;                 // e.g. "Calculus I"
  credits!: number;              // e.g. 3
  desiredLetterGrade!: string;   // e.g. "A"
  gradingScaleId?: string;       // optional for later
}
