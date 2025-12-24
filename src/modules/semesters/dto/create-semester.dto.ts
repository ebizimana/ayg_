import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class CreateSemesterDto {
  @IsString()
  @IsNotEmpty()
  name!: string;       // e.g. "Fall 2025"

  @IsDateString()
  startDate!: string;  // ISO string

  @IsDateString()
  endDate!: string;    // ISO string
}
