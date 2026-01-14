import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class EnableTargetGpaDto {
  @IsIn(['CAREER', 'YEAR', 'SEMESTER'])
  scope!: 'CAREER' | 'YEAR' | 'SEMESTER';

  @IsNumber()
  @Min(0)
  @Max(4)
  targetGpa!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  yearIndex?: number;

  @IsOptional()
  @IsString()
  semesterId?: string;
}
