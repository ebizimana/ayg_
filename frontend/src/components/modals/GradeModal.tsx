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
import { Textarea } from "@/components/ui/textarea";

interface GradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: GradeFormData) => void;
  initialData?: GradeFormData;
  assignmentName?: string;
}

export interface GradeFormData {
  pointsEarned: number;
  notes?: string;
  gradedAt?: string;
}

export function GradeModal({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  assignmentName,
}: GradeModalProps) {
  const [formData, setFormData] = useState<GradeFormData>(
    initialData || {
      pointsEarned: 0,
      notes: "",
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
            <DialogTitle>
              {initialData ? "Update Grade" : "Enter Grade"}
            </DialogTitle>
            {assignmentName && (
              <DialogDescription>
                Recording grade for: <strong>{assignmentName}</strong>
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="pointsEarned">Points Earned</Label>
              <Input
                id="pointsEarned"
                type="number"
                min={0}
                step={0.5}
                value={formData.pointsEarned}
                onChange={(e) =>
                  setFormData({ ...formData, pointsEarned: Number(e.target.value) })
                }
                required
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gradedAt">Date Graded (optional)</Label>
              <Input
                id="gradedAt"
                type="date"
                value={formData.gradedAt ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, gradedAt: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any notes about this grade..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {initialData ? "Update Grade" : "Save Grade"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
