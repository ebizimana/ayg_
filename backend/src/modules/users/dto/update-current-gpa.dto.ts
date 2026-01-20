import { IsNumber, Max, Min } from 'class-validator';

export class UpdateCurrentGpaDto {
  @IsNumber()
  @Min(0)
  @Max(4)
  currentGpa: number;
}
