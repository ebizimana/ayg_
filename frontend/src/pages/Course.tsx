import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CourseModal } from "@/components/modals";
import { useToast } from "@/hooks/use-toast";
import { http } from "@/lib/http";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  MoreHorizontal,
  Play,
  Plus,
  GraduationCap,
  User,
  Settings,
  LogOut,
  Pencil,
} from "lucide-react";

type Assignment = {
  id: string;
  name: string;
  earned?: number;
  expected?: number;
  max: number;
  categoryId?: string;
  isExtraCredit: boolean;
  sortOrder: number;
};

type AssignmentForm = {
  id: string;
  name: string;
  earned: string;
  expected: string;
  max: string;
  categoryId: string;
  isExtraCredit: boolean;
};

type CourseResponse = {
  id?: string;
  name?: string;
  credits?: number;
  desiredLetterGrade?: string;
  actualPercentGrade?: number | null;
  actualLetterGrade?: string | null;
  gradeFinalizedAt?: string | null;
  code?: string;
};
type Category = { id: string; name: string; weightPercent: number; dropLowest?: number; assignmentsCount?: number };
type GradePlan = {
  actualPercent: number | null;
  projectedPercent: number | null;
  requirements: { id: string; requiredPoints: number }[];
};

const gradeTargets: Record<string, number> = {
  A: 90,
  B: 80,
  C: 70,
  D: 60,
  F: 0,
};

const gradeBadgeClasses: Record<string, string> = {
  A: "from-primary to-primary-dark",
  B: "from-success to-success/70",
  C: "from-warning to-warning/70",
  D: "from-amber-500 to-amber-700",
  F: "from-destructive to-destructive/70",
};

const options = ["A", "B", "C", "D", "F"];

const toForm = (assignment: Assignment): AssignmentForm => ({
  id: assignment.id,
  name: assignment.name,
  earned: assignment.earned?.toString() ?? "",
  expected: assignment.expected?.toString() ?? "",
  max: assignment.max.toString(),
  categoryId: assignment.categoryId ?? "",
  isExtraCredit: assignment.isExtraCredit,
});

const toAssignment = (form: AssignmentForm): Assignment => ({
  id: form.id,
  name: form.name.trim() || "Untitled assignment",
  earned: form.earned ? Number(form.earned) : undefined,
  expected: form.expected ? Number(form.expected) : undefined,
  max: form.max ? Number(form.max) : 0,
  categoryId: form.categoryId,
  isExtraCredit: form.isExtraCredit,
  sortOrder: 0,
});

export default function CoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const nav = useNavigate();
  const [courseName, setCourseName] = useState("Calculus I");
  const [courseCode, setCourseCode] = useState("");
  const [courseCredits, setCourseCredits] = useState(3);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>("A");
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [form, setForm] = useState<AssignmentForm | null>(null);
  const [mode, setMode] = useState<"edit" | "add">("edit");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editCourseOpen, setEditCourseOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "earned" | "expected" | "category" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(false);
  const [actualPercent, setActualPercent] = useState<number | null>(null);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const [course, cats] = await Promise.all([
        http<CourseResponse>(`/courses/${courseId}`),
        http<any[]>(`/courses/${courseId}/categories`),
      ]);
      if (course?.name) setCourseName(course.name);
      if (course?.credits !== undefined) setCourseCredits(course.credits);
      if (course?.code !== undefined) setCourseCode(course.code);
      if ((course as any)?.desiredLetterGrade) setSelectedGrade((course as any).desiredLetterGrade);
      if ((course as any)?.actualPercentGrade !== undefined && (course as any)?.actualPercentGrade !== null) {
        setActualPercent((course as any).actualPercentGrade / 100);
      }

      const mappedCategories: Category[] =
        cats?.map((c: any) => ({
          id: c.id,
          name: c.name,
          weightPercent: c.weightPercent,
          dropLowest: c.dropLowest,
          assignmentsCount: c._count?.assignments ?? 0,
        })) ?? [];
      setCategories(mappedCategories);

      const assignmentsByCategory = await Promise.all(
        (cats ?? []).map((cat: any) => http<any[]>(`/categories/${cat.id}/assignments`)),
      );
      const mappedAssignments: Assignment[] = assignmentsByCategory
        .flat()
        .map((a: any) => ({
          id: a.id,
          name: a.name,
          max: a.maxPoints,
          categoryId: a.categoryId,
          earned: a.grade?.earnedPoints ?? undefined,
          expected: a.grade?.earnedPoints != null ? undefined : a.grade?.expectedPoints ?? undefined,
          isExtraCredit: a.isExtraCredit ?? false,
          sortOrder: a.sortOrder ?? 0,
        }))
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      setAssignments(mappedAssignments);

      // load grade plan for current target to hydrate expected for remaining
      const plan = await http<GradePlan>(`/courses/${courseId}/grade-plan?desiredGrade=${selectedGrade}`);
      setActualPercent(plan.actualPercent);
      if (plan.requirements?.length) {
        setAssignments((prev) =>
          prev.map((a) => {
            const req = plan.requirements.find((r) => r.id === a.id);
            return req && a.earned === undefined ? { ...a, expected: req.requiredPoints } : a;
          }),
        );
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Failed to load course data",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [courseId, toast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const totalMax = useMemo(() => assignments.reduce((sum, a) => sum + a.max, 0), [assignments]);
  const earnedPoints = useMemo(
    () => assignments.reduce((sum, a) => sum + (a.earned ?? 0), 0),
    [assignments],
  );
  const gradedMaxPoints = useMemo(
    () => assignments.reduce((sum, a) => sum + (a.earned !== undefined ? a.max : 0), 0),
    [assignments],
  );
  const gradedCount = assignments.filter((a) => a.earned !== undefined).length;
  const currentPercent = totalMax === 0 ? 0 : Math.round((earnedPoints / totalMax) * 100);
  const actualPercentValue = actualPercent !== null ? Math.round(actualPercent * 100) : currentPercent;
  const actualLetter = useMemo(() => {
    if (actualPercentValue >= gradeTargets.A) return "A";
    if (actualPercentValue >= gradeTargets.B) return "B";
    if (actualPercentValue >= gradeTargets.C) return "C";
    if (actualPercentValue >= gradeTargets.D) return "D";
    return "F";
  }, [actualPercentValue]);
  const heroLetter = assignments.length === 0 || gradedCount === 0 ? "A" : actualLetter;

  const pointsLeftToLose = useMemo(() => {
    const target = gradeTargets[selectedGrade] ?? 90;
    const targetPoints = (target / 100) * totalMax;
    const lostSoFar = assignments.reduce((sum, a) => {
      if (a.earned === undefined) return sum;
      return sum + Math.max(a.max - a.earned, 0);
    }, 0);
    const left = totalMax - targetPoints - lostSoFar;
    return Math.max(Math.round(left), 0);
  }, [assignments, selectedGrade, totalMax]);

  const remainingMaxPoints = useMemo(
    () => assignments.reduce((sum, a) => sum + (a.earned === undefined ? a.max : 0), 0),
    [assignments],
  );

  const neededPoints = useMemo(() => {
    const target = gradeTargets[selectedGrade] ?? 90;
    const targetPoints = (target / 100) * totalMax;
    return targetPoints - earnedPoints;
  }, [earnedPoints, selectedGrade, totalMax]);

  const neededAvgOnRemaining = useMemo(() => {
    if (remainingMaxPoints <= 0) return null;
    const avg = neededPoints / remainingMaxPoints;
    return Math.max(0, Math.min(1, avg));
  }, [neededPoints, remainingMaxPoints]);

  const targetMet = neededPoints <= 0;

  const riskLevel =
    pointsLeftToLose < 10 ? "danger" : pointsLeftToLose < 20 ? "caution" : "safe";
  const riskLabel = riskLevel === "safe" ? "Safe" : riskLevel === "caution" ? "Caution" : "Danger";

  const categoryNameFor = (categoryId?: string) => categories.find((c) => c.id === categoryId)?.name ?? "—";

  const sortedAssignments = useMemo(() => {
    if (!sortBy) return assignments;
    const list = [...assignments];
    list.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortBy === "name") return a.name.localeCompare(b.name) * dir;
      if (sortBy === "category") return categoryNameFor(a.categoryId).localeCompare(categoryNameFor(b.categoryId)) * dir;
      if (sortBy === "earned") return ((a.earned ?? -Infinity) - (b.earned ?? -Infinity)) * dir;
      if (sortBy === "expected") return ((a.expected ?? -Infinity) - (b.expected ?? -Infinity)) * dir;
      return 0;
    });
    return list;
  }, [assignments, sortBy, sortDir, categories]);

  const openEditor = (assignment: Assignment) => {
    setMode("edit");
    setForm(toForm(assignment));
  };

  const openCreate = () => {
    if (!categories.length) {
      toast({ title: "Add a category first", variant: "destructive" });
      return;
    }
    const nextId = `new-${Date.now()}`;
    setMode("add");
    setForm({
      id: nextId,
      name: "",
      earned: "",
      expected: "",
      max: "100",
      categoryId: categories[0]?.id ?? "",
      isExtraCredit: false,
    });
  };

  const saveAssignment = async () => {
    if (!form) return;
    if (!form.categoryId) {
      toast({ title: "Pick a category first", variant: "destructive" });
      return;
    }
    const payload = toAssignment(form);
    const existing = mode === "edit" ? assignments.find((a) => a.id === payload.id) : undefined;
    const earnedCleared = !!existing && existing.earned !== undefined && payload.earned === undefined;
    const normalizedEarned = earnedCleared ? null : payload.earned;
    const normalizedExpected = payload.earned !== undefined ? null : payload.expected;
    const hasGradeInput =
      payload.earned !== undefined || payload.expected !== undefined || earnedCleared;
    try {
      if (mode === "add") {
        const created = await http<any>(`/categories/${payload.categoryId}/assignments`, {
          method: "POST",
          body: JSON.stringify({
            name: payload.name,
            maxPoints: payload.max,
            isExtraCredit: payload.isExtraCredit,
          }),
        });
        if (hasGradeInput) {
          await upsertGrade(created.id, normalizedEarned, normalizedExpected);
        }
        setAssignments((prev) => [
          ...prev,
          {
            id: created.id,
            name: created.name,
            max: created.maxPoints,
            categoryId: created.categoryId,
            earned: normalizedEarned === null ? undefined : payload.earned,
            expected: payload.earned !== undefined ? undefined : normalizedExpected ?? undefined,
            isExtraCredit: payload.isExtraCredit,
            sortOrder: created.sortOrder ?? prev.length + 1,
          },
        ]);
      } else {
        await http(`/assignments/${payload.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: payload.name,
            maxPoints: payload.max,
            isExtraCredit: payload.isExtraCredit,
            categoryId: payload.categoryId,
          }),
        });
        if (hasGradeInput) {
          await upsertGrade(payload.id, normalizedEarned, normalizedExpected);
        }
        setAssignments((prev) =>
          prev.map((a) =>
            a.id === payload.id
              ? {
                  ...a,
                  name: payload.name,
                  max: payload.max,
                  earned: normalizedEarned === null ? undefined : payload.earned,
                  expected: payload.earned !== undefined ? undefined : normalizedExpected ?? undefined,
                  isExtraCredit: payload.isExtraCredit,
                  categoryId: payload.categoryId,
                }
              : a,
          ),
        );
      }
      toast({ title: mode === "add" ? "Assignment added" : "Assignment saved", description: payload.name });
    } catch (err) {
      // toast handled in helpers when appropriate
    } finally {
      setForm(null);
    }
  };

  const deleteAssignment = async (id: string) => {
    try {
      await http(`/assignments/${id}`, { method: "DELETE" });
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      setForm(null);
      toast({ title: "Assignment deleted" });
    } catch (err) {
      toast({
        title: "Failed to delete assignment",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const runSimulation = async () => {
    if (!courseId) return;
    try {
      const plan = await http<GradePlan>(`/courses/${courseId}/grade-plan?desiredGrade=${selectedGrade}`);
      setActualPercent(plan.actualPercent);
      if (plan.requirements?.length) {
        setAssignments((prev) =>
          prev.map((a) => {
            const req = plan.requirements.find((r) => r.id === a.id);
            return req && a.earned === undefined ? { ...a, expected: req.requiredPoints } : a;
          }),
        );
      }
      setLastRun(`Simulation updated for ${selectedGrade} target.`);
      toast({ title: "Simulation ran", description: `Target grade: ${selectedGrade}` });
    } catch (err) {
      toast({
        title: "Simulation failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCourseSave = (data: { name: string; code: string; credits: number; targetGrade: string }) => {
    if (courseId) {
      http(`/courses/${courseId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: data.name,
          code: data.code,
          credits: data.credits,
          desiredLetterGrade: data.targetGrade,
        }),
      }).catch(() => undefined);
    }
    setCourseName(data.name);
    setSelectedGrade(data.targetGrade);
    setCourseCredits(data.credits);
    setCourseCode(data.code);
    toast({ title: "Course updated", description: data.name });
  };

  const upsertGrade = async (
    assignmentId: string,
    earned?: number | null,
    expected?: number | null,
  ) => {
    try {
      if (earned === undefined && expected === undefined) {
        await http(`/assignments/${assignmentId}/grade`, { method: "DELETE" });
        return;
      }
      await http(`/assignments/${assignmentId}/grade`, {
        method: "PUT",
        body: JSON.stringify({
          earnedPoints: earned,
          expectedPoints: expected,
        }),
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Grade update failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
      throw err;
    }
  };

  const handleDeleteCourse = () => {
    setConfirmDeleteOpen(false);
    if (!courseId) return;
    http(`/courses/${courseId}`, { method: "DELETE" })
      .then(() => {
        toast({ title: "Course deleted", description: `${courseName} removed`, variant: "destructive" });
        nav("/dashboard");
      })
      .catch((err) =>
        toast({
          title: "Failed to delete course",
          description: err instanceof Error ? err.message : "Please try again.",
          variant: "destructive",
        }),
      );
  };

  const handleSort = (column: "name" | "earned" | "expected" | "category") => {
    if (sortBy === column) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  };

  const handleDragStart = (id: string) => {
    setDraggingId(id);
    setSortBy(null); // manual order overrides sort
  };

  const persistAssignmentOrder = async (ordered: Assignment[]) => {
    try {
      await http(`/assignments/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ orderedIds: ordered.map((a) => a.id) }),
      });
    } catch (err) {
      toast({
        title: "Failed to save order",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDrop = (targetId: string) => {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      return;
    }
    const list = [...assignments];
    const fromIndex = list.findIndex((a) => a.id === draggingId);
    const toIndex = list.findIndex((a) => a.id === targetId);
    if (fromIndex === -1 || toIndex === -1) {
      setDraggingId(null);
      return;
    }
    const [item] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, item);
    const ordered = list.map((assignment, index) => ({ ...assignment, sortOrder: index + 1 }));
    setAssignments(ordered);
    void persistAssignmentOrder(ordered);
    setDraggingId(null);
  };

  const signOut = () => {
    localStorage.clear();
    nav("/auth?mode=login");
  };

  const formatScore = (value?: number, max?: number) => {
    if (value === undefined || max === undefined) return "—";
    return `${value} / ${max}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-slate-50 pb-12">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground hidden sm:block">AYG</span>
            </Link>
            <span className="text-slate-400">›</span>
            <span className="font-semibold text-slate-700">Course</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <span>{localStorage.getItem("ayg_email") ?? "Profile"}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-2xl border border-slate-200 bg-white/80 shadow-md backdrop-blur">
          <div className="flex items-center gap-4 px-5 py-4">
            <div
              className={`h-12 w-12 rounded-xl bg-gradient-to-br text-white font-bold grid place-items-center shadow-lg ${gradeBadgeClasses[heroLetter] ?? "from-primary to-primary-dark"}`}
            >
              {heroLetter}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-primary font-semibold">Course</p>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">{courseName}</h1>
                <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem
                      onClick={() => {
                        setMenuOpen(false);
                        setEditCourseOpen(true);
                      }}
                    >
                      Edit course
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setMenuOpen(false);
                        if (courseId) nav(`/courses/${courseId}/categories`);
                        else nav("/dashboard");
                      }}
                    >
                      Manage categories
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => {
                        setMenuOpen(false);
                        setConfirmDeleteOpen(true);
                      }}
                    >
                      Delete course
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="text-sm text-muted-foreground">
                Set a target grade, run the simulation, and see what you need on each assignment.
              </p>
            </div>
          </div>
          <div className="flex items-end gap-3 px-5 pb-4 md:pb-0">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-foreground">Target grade</span>
              <Select value={selectedGrade} onValueChange={(value) => setSelectedGrade(value)}>
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="Grade" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="gap-2" onClick={runSimulation}>
              <Play className="h-4 w-4" />
              Run
            </Button>
          </div>
        </div>

        {categories.length === 0 ? (
          <Card className="bg-muted/30 border-dashed">
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm">No categories yet</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => nav(`/courses/${courseId}/categories`)}>
                Add your first category
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200 shadow-lg">
            <CardHeader className="pb-3 flex flex-row items-center justify-center">
              <div className="flex items-center gap-2">
                <Button variant="outline" className="gap-2" onClick={() => nav(`/courses/${courseId}/categories`)}>
                  <Pencil className="h-4 w-4" />
                  Manage categories
                </Button>
                <Button variant="outline" className="gap-2" onClick={openCreate} disabled={loading || !categories.length}>
                  <Plus className="h-4 w-4" />
                  Add assignment
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-hidden">
              <div className="grid grid-cols-12 bg-slate-50 text-sm font-semibold text-slate-600 rounded-t-lg border border-slate-200">
                <div className="col-span-1 px-4 py-3 flex items-center">
                  <span className="sr-only">Drag</span>
                </div>
                <button
                  className="col-span-4 px-4 py-3 flex items-center gap-1 text-left hover:text-primary"
                  onClick={() => handleSort("name")}
                >
                  Name
                  {sortBy === "name" && <ChevronUp className={`h-4 w-4 ${sortDir === "desc" ? "rotate-180" : ""}`} />}
                </button>
                <button
                  className="col-span-3 px-4 py-3 flex items-center gap-1 text-left hover:text-primary"
                  onClick={() => handleSort("earned")}
                >
                  Earned
                  {sortBy === "earned" && <ChevronUp className={`h-4 w-4 ${sortDir === "desc" ? "rotate-180" : ""}`} />}
                </button>
                <button
                  className="col-span-2 px-4 py-3 flex items-center gap-1 text-left hover:text-primary"
                  onClick={() => handleSort("expected")}
                >
                  Expected
                  {sortBy === "expected" && <ChevronUp className={`h-4 w-4 ${sortDir === "desc" ? "rotate-180" : ""}`} />}
                </button>
                <button
                  className="col-span-2 px-4 py-3 flex items-center gap-1 text-left hover:text-primary"
                  onClick={() => handleSort("category")}
                >
                  Category
                  {sortBy === "category" && <ChevronUp className={`h-4 w-4 ${sortDir === "desc" ? "rotate-180" : ""}`} />}
                </button>
              </div>
              <div className="divide-y divide-slate-200 border border-t-0 border-slate-200 rounded-b-lg">
                {sortedAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className={`grid grid-cols-12 items-center bg-white hover:bg-slate-50 transition-colors ${
                      draggingId === assignment.id ? "opacity-75" : ""
                    }`}
                    draggable
                    onDragStart={() => handleDragStart(assignment.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(assignment.id)}
                  >
                    <div className="col-span-1 px-4 py-3 flex items-center text-slate-400">
                      <GripVertical className="h-5 w-5" />
                    </div>
                    <div className="col-span-4 px-4 py-3">
                      <button
                        className="text-left font-semibold text-foreground hover:text-primary transition-colors"
                        onClick={() => openEditor(assignment)}
                      >
                        <span className="flex items-center gap-2">
                          {assignment.name}
                          {assignment.isExtraCredit && (
                            <Badge className="rounded-full bg-success/20 text-success border-success/30 px-2 py-0.5 text-[10px]">
                              EC
                            </Badge>
                          )}
                        </span>
                      </button>
                    </div>
                    <div className="col-span-3 px-4 py-3 text-muted-foreground">
                      {assignment.earned === undefined ? "—" : formatScore(assignment.earned, assignment.max)}
                    </div>
                    <div className="col-span-2 px-4 py-3 text-primary font-semibold">
                      {assignment.expected === undefined ? "—" : formatScore(assignment.expected, assignment.max)}
                    </div>
                    <div className="col-span-2 px-4 py-3 text-muted-foreground font-semibold">
                      {categoryNameFor(assignment.categoryId)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-slate-200 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Current grade</CardTitle>
            </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-center gap-3 text-center">
              <div
                className={`h-12 w-12 rounded-full bg-gradient-to-br text-white font-bold grid place-items-center shadow-lg ${gradeBadgeClasses[actualLetter] ?? ""}`}
              >
                {actualLetter}
              </div>
              <div>
                <p className="text-4xl font-bold text-foreground leading-none">
                  {actualPercent !== null ? Math.round(actualPercent * 100) : currentPercent}%
                </p>
              </div>
            </div>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Graded assignments</span>
                <span className="font-semibold text-foreground">
                  {gradedCount} {gradedCount === 1 ? "assignment" : "assignments"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Ungraded assignments</span>
                <span className="font-semibold text-foreground">
                  {assignments.length - gradedCount}{" "}
                  {assignments.length - gradedCount === 1 ? "assignment" : "assignments"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Points earned so far</span>
                <span className="font-semibold text-foreground">
                  {Math.round(earnedPoints)} / {Math.round(gradedMaxPoints)} pts
                </span>
              </div>
            </div>
          </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Points left to lose</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-center">
              <p
                className={`text-3xl font-bold ${
                  pointsLeftToLose < 10
                    ? "text-destructive"
                    : pointsLeftToLose < 20
                      ? "text-warning"
                      : "text-foreground"
                }`}
              >
                {pointsLeftToLose} pts
              </p>
              <p className="text-sm text-muted-foreground px-2">
                {pointsLeftToLose === 0
                  ? "You have lost too many points to reach your target grade."
                  : "Total points you can still lose and keep your target grade."}
              </p>
              {lastRun && (
                <p className="text-xs font-semibold text-success-foreground bg-success rounded-md px-3 py-2">
                  {lastRun}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex justify-center">
                <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold">
                {pointsLeftToLose > 0 ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span>On Track</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span>Needs attention</span>
                  </>
                )}
                </div>
              </div>
              <div className="grid gap-2 text-sm pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Risk level</span>
                  <span
                    className={`font-semibold ${
                      riskLevel === "safe"
                        ? "text-success"
                        : riskLevel === "caution"
                          ? "text-warning"
                          : "text-destructive"
                    }`}
                  >
                    {riskLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Needed avg on remaining</span>
                  <span className="font-semibold text-foreground">
                    {neededAvgOnRemaining === null
                      ? "—"
                      : targetMet
                        ? "0% (target met)"
                        : `${Math.round(neededAvgOnRemaining * 100)}%`}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!form} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mode === "add" ? "Add assignment" : "Edit assignment"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.categoryId} onValueChange={(value) => setForm({ ...form, categoryId: value })}>
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Earned</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.earned}
                    placeholder="Leave blank if ungraded"
                    onChange={(e) => setForm({ ...form, earned: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max points</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.max}
                    onChange={(e) => setForm({ ...form, max: e.target.value })}
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
                  checked={form.isExtraCredit}
                  onCheckedChange={(checked) => setForm({ ...form, isExtraCredit: checked })}
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            {mode === "edit" && form && (
              <Button variant="outline" className="text-destructive border-destructive" onClick={() => deleteAssignment(form.id)}>
                Delete
              </Button>
            )}
            <div className="flex-1" />
            <Button onClick={saveAssignment}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CourseModal
        open={editCourseOpen}
        onOpenChange={setEditCourseOpen}
        onSubmit={handleCourseSave}
        initialData={{
          name: courseName,
          code: courseCode,
          credits: courseCredits,
          targetGrade: selectedGrade,
        }}
      />

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this course?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground">
            This will remove {courseName} and its assignments. This action cannot be undone.
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDeleteCourse}>
              Delete course
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
