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

interface YearModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: YearFormData) => void;
  onDelete?: () => void | Promise<void>;
  targetGpa?: {
    enabled: boolean;
    value?: number | null;
    locked?: boolean;
    lockedMessage?: string;
    onSave: (enabled: boolean, value?: number) => void;
  };
  initialData?: YearFormData;
}

export interface YearFormData {
  name: string;
  startDate: string;
  endDate: string;
}

export function YearModal({
  open,
  onOpenChange,
  onSubmit,
  onDelete,
  targetGpa,
  initialData,
}: YearModalProps) {
  const [formData, setFormData] = useState<YearFormData>(
    initialData || {
      name: "",
      startDate: "",
      endDate: "",
    },
  );
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [targetEnabled, setTargetEnabled] = useState(targetGpa?.enabled ?? false);
  const [targetValue, setTargetValue] = useState(targetGpa?.value?.toString() ?? "");
  const targetGpaInvalid =
    !!targetGpa && targetEnabled && (targetValue.trim() === "" || Number.isNaN(Number(targetValue)));

  useEffect(() => {
    if (!open) return;
    setFormData(
      initialData || {
        name: "",
        startDate: "",
        endDate: "",
      },
    );
    setTargetEnabled(targetGpa?.enabled ?? false);
    setTargetValue(targetGpa?.value?.toString() ?? "");
  }, [open, initialData, targetGpa]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (targetGpaInvalid) return;
    onSubmit(formData);
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
            <DialogTitle>{initialData ? "Edit Year" : "Add Year"}</DialogTitle>
            <DialogDescription>
              Manage the label and date range for your academic year.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="year-name">Year name</Label>
              <Input
                id="year-name"
                placeholder="Freshman Year"
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="year-start">Start date</Label>
                <Input
                  id="year-start"
                  type="date"
                  value={formData.startDate}
                  onChange={(event) => setFormData({ ...formData, startDate: event.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="year-end">End date</Label>
                <Input
                  id="year-end"
                  type="date"
                  value={formData.endDate}
                  onChange={(event) => setFormData({ ...formData, endDate: event.target.value })}
                />
              </div>
            </div>
            {initialData && targetGpa ? (
              <div className="grid gap-3 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="targetGpaToggle">Set Year GPA</Label>
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
                Delete Year
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
                {initialData ? "Save Changes" : "Add Year"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this year?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the year and all related semesters, courses, categories, assignments, and grades.
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
