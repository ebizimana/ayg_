import { IsBoolean, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateAssignmentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsNumber()
  maxPoints?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;        // allow clearing

  @IsOptional()
  @IsBoolean()
  isExtraCredit?: boolean;

  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
