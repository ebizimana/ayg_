export class UpdateAssignmentDto {
  name?: string;
  maxPoints?: number;
  dueDate?: string | null;        // allow clearing
  isExtraCredit?: boolean;
}
