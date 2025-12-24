import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsNumber()
  weightPercent?: number;

  @IsOptional()
  @IsInt()
  dropLowest?: number;
}
