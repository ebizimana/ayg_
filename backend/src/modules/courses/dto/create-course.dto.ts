import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  name!: string;                 // e.g. "Calculus I"

  @IsInt()
  credits!: number;              // e.g. 3

  @IsString()
  @IsNotEmpty()
  desiredLetterGrade!: string;   // e.g. "A"

  @IsOptional()
  @IsString()
  code?: string;                  // e.g. "ENG101"

  @IsOptional()
  @IsString()
  gradingScaleId?: string;       // optional for later
}
