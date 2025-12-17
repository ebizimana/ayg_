export class CreateCategoryDto {
  name!: string;           // e.g. "Homework"
  weightPercent!: number;  // e.g. 30
  dropLowest?: number;     // optional, default 0
}
