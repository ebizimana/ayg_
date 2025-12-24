import { IsISO8601, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateGradeDto {
  @IsOptional()
  @IsNumber()
  expectedPoints?: number;

  @IsOptional()
  @IsNumber()
  earnedPoints?: number;

  @IsOptional()
  @IsISO8601()
  gradedAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
