import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSemesterDto {
  @IsString()
  @IsNotEmpty()
  yearId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;       // e.g. "Fall 2025"

  @IsDateString()
  @IsOptional()
  startDate?: string;  // ISO string

  @IsDateString()
  @IsOptional()
  endDate?: string;    // ISO string
}
