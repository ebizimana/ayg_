import { useEffect, useState } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CategoryFormData) => void;
  initialData?: CategoryFormData;
  onDelete?: () => void;
  gradingMethod?: "WEIGHTED" | "POINTS";
}

export interface CategoryFormData {
  name: string;
  weight: number;
  dropLowest: boolean;
  dropCount: number;
}

export function CategoryModal({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  onDelete,
  gradingMethod = "WEIGHTED",
}: CategoryModalProps) {
  const emptyForm: CategoryFormData = {
    name: "",
    weight: 0,
    dropLowest: false,
    dropCount: 1,
  };
  const [formData, setFormData] = useState<CategoryFormData>(
    initialData || emptyForm
  );
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFormData(initialData || emptyForm);
  }, [open, initialData]);

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
            <DialogTitle>{initialData ? "Edit Category" : "Add Category"}</DialogTitle>
            <DialogDescription>
              Define a grade category (e.g., Homework, Exams, Quizzes).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Category Name</Label>
              <Input
                id="name"
                placeholder="e.g., Homework, Exams, Quizzes"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="weight">Weight (%)</Label>
              <Input
                id="weight"
                type="number"
                min={0}
                max={100}
                placeholder="e.g., 30"
                value={formData.weight}
                onChange={(e) =>
                  setFormData({ ...formData, weight: Number(e.target.value) })
                }
                disabled={gradingMethod === "POINTS"}
                required={gradingMethod !== "POINTS"}
              />
              <p className="text-xs text-muted-foreground">
                {gradingMethod === "POINTS"
                  ? "Points-based grading ignores category weights."
                  : "How much this category counts toward your final grade."}
              </p>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="dropLowest">Drop Lowest Grades</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically exclude lowest scores.
                </p>
              </div>
              <Switch
                id="dropLowest"
                checked={formData.dropLowest}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, dropLowest: checked })
                }
              />
            </div>
            {formData.dropLowest && (
              <div className="grid gap-2">
                <Label htmlFor="dropCount">Number to Drop</Label>
                <Input
                  id="dropCount"
                  type="number"
                  min={1}
                  max={10}
                  value={formData.dropCount}
                  onChange={(e) =>
                    setFormData({ ...formData, dropCount: Number(e.target.value) })
                  }
                />
              </div>
            )}
          </div>
          <DialogFooter>
            {onDelete && initialData && (
              <Button type="button" variant="outline" className="text-destructive border-destructive" onClick={() => setConfirmDeleteOpen(true)}>
                Delete
              </Button>
            )}
            <div className="flex-1" />
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{initialData ? "Save Changes" : "Add Category"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this category?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground">Assignments will remain but lose their category tag.</p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                setConfirmDeleteOpen(false);
                onOpenChange(false);
                onDelete?.();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
