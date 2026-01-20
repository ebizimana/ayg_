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
import { InfoPopover } from "@/components/InfoPopover";

interface TargetGpaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  toggleLabel: string;
  infoText?: string;
  enabled: boolean;
  targetGpa?: number | null;
  locked?: boolean;
  lockedMessage?: string;
  onSave: (enabled: boolean, targetGpa?: number) => void;
}

export function TargetGpaModal({
  open,
  onOpenChange,
  title,
  description,
  toggleLabel,
  infoText,
  enabled,
  targetGpa,
  locked,
  lockedMessage,
  onSave,
}: TargetGpaModalProps) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [value, setValue] = useState(targetGpa?.toString() ?? "");

  useEffect(() => {
    if (!open) return;
    setIsEnabled(enabled);
    setValue(targetGpa?.toString() ?? "");
  }, [open, enabled, targetGpa]);

  const numericValue = Number(value);
  const canSave =
    !locked &&
    (!isEnabled || (value.trim().length > 0 && !Number.isNaN(numericValue)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label htmlFor="targetGpaToggle">{toggleLabel}</Label>
                {infoText ? <InfoPopover text={infoText} /> : null}
              </div>
              {locked && lockedMessage ? (
                <p className="text-xs text-muted-foreground">{lockedMessage}</p>
              ) : null}
            </div>
            <Switch
              id="targetGpaToggle"
              checked={isEnabled}
              disabled={locked}
              onCheckedChange={setIsEnabled}
            />
          </div>
          {isEnabled ? (
            <div className="grid gap-2">
              <Label htmlFor="targetGpaValue">Target GPA</Label>
              <Input
                id="targetGpaValue"
                type="number"
                step="0.01"
                min="0"
                max="4"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                disabled={locked}
                placeholder="3.50"
              />
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              onSave(isEnabled, isEnabled ? Number(value) : undefined);
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
