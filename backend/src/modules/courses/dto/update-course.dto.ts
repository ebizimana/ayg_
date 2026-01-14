import { IsBoolean, IsDateString, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  code?: string;

  @IsOptional()
  @IsInt()
  credits?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  desiredLetterGrade?: string;

  @IsOptional()
  @IsIn(['WEIGHTED', 'POINTS'])
  gradingMethod?: 'WEIGHTED' | 'POINTS';

  @IsOptional()
  @IsString()
  gradingScaleId?: string | null;

  @IsOptional()
  @IsString()
  actualLetterGrade?: string | null;

  @IsOptional()
  @IsNumber()
  actualPercentGrade?: number | null;

  @IsOptional()
  @IsInt()
  actualPointsLeftToLose?: number | null;

  @IsOptional()
  @IsDateString()
  gradeFinalizedAt?: string | null; // ISO string

  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;

}
