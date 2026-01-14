import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SemesterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: SemesterFormData) => void;
  onDelete?: () => void | Promise<void>;
  targetGpa?: {
    enabled: boolean;
    value?: number | null;
    locked?: boolean;
    lockedMessage?: string;
    onSave: (enabled: boolean, value?: number) => void;
  };
  initialData?: SemesterFormData;
}

export interface SemesterFormData {
  name: string;
  year: string;
  season: string;
  startDate?: string;
  endDate?: string;
}

const seasons = ["Fall", "Spring", "Summer", "Winter"];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 6 }, (_, i) => String(currentYear - 2 + i));

export function SemesterModal({
  open,
  onOpenChange,
  onSubmit,
  onDelete,
  targetGpa,
  initialData,
}: SemesterModalProps) {
  const [formData, setFormData] = useState<SemesterFormData>(
    initialData || {
      name: "",
      year: String(currentYear),
      season: "Fall",
    }
  );

  useEffect(() => {
    if (!open) return;
    setFormData(
      initialData || {
        name: "",
        year: String(currentYear),
        season: "Fall",
      }
    );
    setTargetEnabled(targetGpa?.enabled ?? false);
    setTargetValue(targetGpa?.value?.toString() ?? "");
  }, [open, initialData, targetGpa]);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [targetEnabled, setTargetEnabled] = useState(targetGpa?.enabled ?? false);
  const [targetValue, setTargetValue] = useState(targetGpa?.value?.toString() ?? "");
  const targetGpaInvalid =
    !!targetGpa && targetEnabled && (targetValue.trim() === "" || Number.isNaN(Number(targetValue)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetGpaInvalid) return;
    const name = formData.name || `${formData.season} ${formData.year}`;
    onSubmit({ ...formData, name });
    if (targetGpa) {
      targetGpa.onSave(targetEnabled, targetEnabled ? Number(targetValue) : undefined);
    }
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    try {
      await onDelete();
      setConfirmDeleteOpen(false);
      onOpenChange(false);
    } catch {
      // Keep the dialog open if the delete fails.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{initialData ? "Edit Semester" : "Add Semester"}</DialogTitle>
            <DialogDescription>
              Create a new semester to organize your courses.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="season">Season</Label>
              <Select
                value={formData.season}
                onValueChange={(value) =>
                  setFormData({ ...formData, season: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select season" />
                </SelectTrigger>
                <SelectContent>
                  {seasons.map((season) => (
                    <SelectItem key={season} value={season}>
                      {season}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="year">Year</Label>
              <Select
                value={formData.year}
                onValueChange={(value) =>
                  setFormData({ ...formData, year: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Custom Name (optional)</Label>
              <Input
                id="name"
                placeholder={`${formData.season} ${formData.year}`}
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                />
              </div>
            </div>
            {initialData && targetGpa ? (
              <div className="grid gap-3 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="targetGpaToggle">Set Semester GPA</Label>
                  <Switch
                    id="targetGpaToggle"
                    checked={targetEnabled}
                    disabled={targetGpa.locked}
                    onCheckedChange={setTargetEnabled}
                  />
                </div>
                {targetGpa.locked && targetGpa.lockedMessage ? (
                  <p className="text-xs text-muted-foreground">{targetGpa.lockedMessage}</p>
                ) : null}
                {targetEnabled ? (
                  <div className="grid gap-2">
                    <Label htmlFor="targetGpaValue">Target GPA</Label>
                    <Input
                      id="targetGpaValue"
                      type="number"
                      step="0.01"
                      min="0"
                      max="4"
                      value={targetValue}
                      onChange={(event) => setTargetValue(event.target.value)}
                      disabled={targetGpa.locked}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <DialogFooter className="flex w-full flex-row items-center justify-between gap-2 sm:justify-between sm:space-x-0">
            {initialData && onDelete ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setConfirmDeleteOpen(true)}
              >
                Delete Semester
              </Button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              {!initialData ? (
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
              ) : null}
              <Button type="submit" disabled={targetGpaInvalid}>
                {initialData ? "Save Changes" : "Add Semester"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this semester?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the semester and all related courses, categories, assignments, and grades.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
