import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name!: string;           // e.g. "Homework"

  @IsNumber()
  weightPercent!: number;  // e.g. 30

  @IsOptional()
  @IsInt()
  dropLowest?: number;     // optional, default 0
}
