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

interface CurrentGpaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentGpa?: number | null;
  onSave: (value: number) => void;
}

export function CurrentGpaModal({
  open,
  onOpenChange,
  currentGpa,
  onSave,
}: CurrentGpaModalProps) {
  const [value, setValue] = useState(currentGpa?.toString() ?? "");

  useEffect(() => {
    if (!open) return;
    setValue(currentGpa?.toString() ?? "");
  }, [open, currentGpa]);

  const numericValue = Number(value);
  const canSave = value.trim().length > 0 && !Number.isNaN(numericValue);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>What's your current GPA?</DialogTitle>
          <DialogDescription>
            The GPA you add will be combined with the GPA from courses you enter.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="currentGpaValue">Current GPA</Label>
          <Input
            id="currentGpaValue"
            type="number"
            step="0.01"
            min="0"
            max="4"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="3.45"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              onSave(Number(value));
              onOpenChange(false);
            }}
            disabled={!canSave}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
