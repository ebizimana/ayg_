import { IsIn, IsOptional, IsString } from 'class-validator';

export class DisableTargetGpaDto {
  @IsOptional()
  @IsIn(['CAREER', 'YEAR', 'SEMESTER'])
  scope?: 'CAREER' | 'YEAR' | 'SEMESTER';

  @IsOptional()
  @IsString()
  yearId?: string;

  @IsOptional()
  @IsString()
  semesterId?: string;
}
