import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateSemesterDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
