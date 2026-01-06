import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface AssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AssignmentFormData) => void;
  initialData?: AssignmentFormData;
}

export interface AssignmentFormData {
  name: string;
  pointsPossible: number;
  pointsEarned?: number;
  dueDate?: string;
  isExtraCredit: boolean;
}

export function AssignmentModal({
  open,
  onOpenChange,
  onSubmit,
  initialData,
}: AssignmentModalProps) {
  const [formData, setFormData] = useState<AssignmentFormData>(
    initialData || {
      name: "",
      pointsPossible: 100,
      isExtraCredit: false,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{initialData ? "Edit Assignment" : "Add Assignment"}</DialogTitle>
            <DialogDescription>
              Add an assignment to track your score.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Assignment Name</Label>
              <Input
                id="name"
                placeholder="e.g., Midterm Exam, Homework 1"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="pointsPossible">Points Possible</Label>
                <Input
                  id="pointsPossible"
                  type="number"
                  min={0}
                  value={formData.pointsPossible}
                  onChange={(e) =>
                    setFormData({ ...formData, pointsPossible: Number(e.target.value) })
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pointsEarned">Points Earned</Label>
                <Input
                  id="pointsEarned"
                  type="number"
                  min={0}
                  placeholder="Leave blank if not graded"
                  value={formData.pointsEarned ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pointsEarned: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dueDate">Due Date (optional)</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, dueDate: e.target.value })
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="extraCredit">Extra Credit</Label>
                <p className="text-xs text-muted-foreground">
                  Points earned don't count against total.
                </p>
              </div>
              <Switch
                id="extraCredit"
                checked={formData.isExtraCredit}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isExtraCredit: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {initialData ? "Save Changes" : "Add Assignment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
