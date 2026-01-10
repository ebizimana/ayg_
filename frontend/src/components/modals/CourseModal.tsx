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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CourseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CourseFormData) => void;
  initialData?: CourseFormData;
}

export interface CourseFormData {
  name: string;
  code: string;
  credits: number;
  targetGrade: string;
  gradingMethod: "WEIGHTED" | "POINTS";
}

const gradeOptions = ["A", "B", "C", "D", "F"];
const gradingOptions = [
  { label: "Weighted categories", value: "WEIGHTED" },
  { label: "Points-based", value: "POINTS" },
];

export function CourseModal({
  open,
  onOpenChange,
  onSubmit,
  initialData,
}: CourseModalProps) {
  const [formData, setFormData] = useState<CourseFormData>({
    name: "",
    code: "",
    credits: 3,
    targetGrade: "A",
    gradingMethod: "WEIGHTED",
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        name: "",
        code: "",
        credits: 3,
        targetGrade: "A",
        gradingMethod: "WEIGHTED",
      });
    }
  }, [initialData, open]);

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
            <DialogTitle>{initialData ? "Edit Course" : "Add Course"}</DialogTitle>
            <DialogDescription>
              Add a new course to track your grades.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="code">Course Code</Label>
              <Input
                id="code"
                placeholder="e.g., CS 101"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Course Name</Label>
              <Input
                id="name"
                placeholder="e.g., Introduction to Computer Science"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="credits">Credits</Label>
                <Input
                  id="credits"
                  type="number"
                  min={1}
                  max={6}
                  value={formData.credits}
                  onChange={(e) =>
                    setFormData({ ...formData, credits: Number(e.target.value) })
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="targetGrade">Target Grade</Label>
                <Select
                  value={formData.targetGrade}
                  onValueChange={(value) =>
                    setFormData({ ...formData, targetGrade: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {gradeOptions.map((grade) => (
                      <SelectItem key={grade} value={grade}>
                        {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gradingMethod">Grading Method</Label>
              <Select
                value={formData.gradingMethod}
                onValueChange={(value) =>
                  setFormData({ ...formData, gradingMethod: value as CourseFormData["gradingMethod"] })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {gradingOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Points-based ignores category weights and uses total points. This can’t be changed after assignments exist.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {initialData ? "Save Changes" : "Add Course"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
