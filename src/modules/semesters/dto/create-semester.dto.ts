export class CreateSemesterDto {
  name!: string;       // e.g. "Fall 2025"
  startDate!: string;  // ISO string
  endDate!: string;    // ISO string
}
