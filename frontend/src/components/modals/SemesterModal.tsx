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
  initialData,
}: SemesterModalProps) {
  const [formData, setFormData] = useState<SemesterFormData>(
    initialData || {
      name: "",
      year: String(currentYear),
      season: "Fall",
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = formData.name || `${formData.season} ${formData.year}`;
    onSubmit({ ...formData, name });
    onOpenChange(false);
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
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {initialData ? "Save Changes" : "Add Semester"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
