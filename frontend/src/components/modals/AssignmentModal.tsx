import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AssignmentFormData) => void;
  categories: { id: string; name: string }[];
  assignments: { categoryId: string; maxPoints: number }[];
}

export interface AssignmentFormData {
  name: string;
  categoryId: string;
  earned: string;
  max: string;
  isExtraCredit: boolean;
}

export function AssignmentModal({
  open,
  onOpenChange,
  onSubmit,
  categories,
  assignments,
}: AssignmentModalProps) {
  const [formData, setFormData] = useState<AssignmentFormData>({
    name: "",
    categoryId: categories[0]?.id ?? "",
    earned: "",
    max: "100",
    isExtraCredit: false,
  });
  const [categoryLocked, setCategoryLocked] = useState(false);
  const [maxLocked, setMaxLocked] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFormData({
      name: "",
      categoryId: categories[0]?.id ?? "",
      earned: "",
      max: "100",
      isExtraCredit: false,
    });
    setCategoryLocked(false);
    setMaxLocked(false);
  }, [open, categories]);

  const suggestCategoryId = (name: string) => {
    const normalizedName = name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!normalizedName) return null;

    const keywordGroups = [
      ["homework", "hw", "h w", "problem set", "ps", "assignment"],
      ["quiz", "quizzes"],
      ["test", "exam", "midterm", "final"],
      ["lab", "labs"],
      ["project", "presentation"],
      ["paper", "essay", "writing"],
      ["participation", "attendance"],
    ];

    let best: { id: string; score: number } | null = null;
    for (const category of categories) {
      const catName = category.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      if (!catName) continue;
      let score = 0;
      if (normalizedName.startsWith(catName)) score = Math.max(score, 2);
      if (normalizedName.includes(catName)) score = Math.max(score, 1);

      for (const group of keywordGroups) {
        const nameMatch = group.some((keyword) => normalizedName.includes(keyword));
        if (!nameMatch) continue;
        const catMatch = group.some((keyword) => catName.includes(keyword));
        if (catMatch) score = Math.max(score, 3);
      }

      if (score > 0 && (!best || score > best.score)) {
        best = { id: category.id, score };
      }
    }

    return best?.id ?? null;
  };

  const suggestMaxPoints = (categoryId: string) => {
    if (!categoryId) return null;
    const values = assignments
      .filter((assignment) => assignment.categoryId === categoryId)
      .map((assignment) => assignment.maxPoints)
      .filter((value) => value > 0);
    if (!values.length) return null;
    const counts = new Map<number, number>();
    for (const value of values) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    let bestValue = values[values.length - 1];
    let bestCount = 0;
    for (const [value, count] of counts) {
      if (count > bestCount) {
        bestValue = value;
        bestCount = count;
      }
    }
    return bestValue;
  };

  const handleNameChange = (value: string) => {
    setFormData((prev) => {
      const next = { ...prev, name: value };
      if (!categoryLocked) {
        const suggested = suggestCategoryId(value);
        if (suggested) next.categoryId = suggested;
      }
      if (!maxLocked) {
        const suggestedMax = suggestMaxPoints(next.categoryId);
        if (suggestedMax !== null) next.max = suggestedMax.toString();
      }
      return next;
    });
  };

  const handleCategoryChange = (value: string) => {
    setFormData((prev) => ({ ...prev, categoryId: value }));
    setCategoryLocked(true);
    if (!maxLocked) {
      const suggestedMax = suggestMaxPoints(value);
      if (suggestedMax !== null) {
        setFormData((prev) => ({ ...prev, max: suggestedMax.toString() }));
      }
    }
  };

  const handleMaxChange = (value: string) => {
    setMaxLocked(true);
    setFormData((prev) => ({ ...prev, max: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add assignment</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="categoryId">Category</Label>
              <Select
                value={formData.categoryId}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="earned">Earned</Label>
                <Input
                  id="earned"
                  type="number"
                  min={0}
                  value={formData.earned}
                  onChange={(e) => setFormData({ ...formData, earned: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="max">Max points</Label>
                <Input
                  id="max"
                  type="number"
                  min={0}
                  value={formData.max}
                  onChange={(e) => handleMaxChange(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="extraCredit">Extra Credit</Label>
                <p className="text-xs text-muted-foreground">
                  Points earned don&apos;t count against total.
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
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
