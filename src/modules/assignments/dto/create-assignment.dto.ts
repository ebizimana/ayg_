import { IsBoolean, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateAssignmentDto {
  @IsString()
  @IsNotEmpty()
  name!: string;              // e.g. "Homework 1"

  @IsNumber()
  maxPoints!: number;         // e.g. 100

  @IsOptional()
  @IsDateString()
  dueDate?: string;           // ISO string

  @IsOptional()
  @IsBoolean()
  isExtraCredit?: boolean;    // default false
}
