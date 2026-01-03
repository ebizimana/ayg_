import { IsIn, IsOptional } from 'class-validator';
import type { GradeLetter } from '../grade-plan.types';

export class GradePlanQueryDto {
  @IsIn(['A', 'B', 'C', 'D', 'F'])
  @IsOptional()
  desiredGrade?: GradeLetter;
}
