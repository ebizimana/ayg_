import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class DisableTargetGpaDto {
  @IsOptional()
  @IsIn(['CAREER', 'YEAR', 'SEMESTER'])
  scope?: 'CAREER' | 'YEAR' | 'SEMESTER';

  @IsOptional()
  @IsInt()
  @Min(0)
  yearIndex?: number;

  @IsOptional()
  @IsString()
  semesterId?: string;
}
