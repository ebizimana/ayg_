export class CreateAssignmentDto {
  name!: string;              // e.g. "Homework 1"
  maxPoints!: number;         // e.g. 100
  dueDate?: string;           // ISO string
  isExtraCredit?: boolean;    // default false
}
