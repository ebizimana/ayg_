import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CategoryModal, type CategoryFormData } from "@/components/modals";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { useToast } from "@/hooks/use-toast";
import { getStoredTier, useUserProfile, type UserTier } from "@/hooks/use-user-profile";
import { http } from "@/lib/http";
import { HelpCircle, ChevronDown, GraduationCap, GripVertical, LogOut, Plus, Settings, User, Lock } from "lucide-react";

type Category = {
  id: string;
  name: string;
  weightPercent: number;
  dropLowest?: number;
  assignmentsCount?: number;
  sortOrder: number;
};
type CourseResponse = { name?: string; gradingMethod?: "WEIGHTED" | "POINTS"; semesterId?: string };
type SemesterResponse = {
  id: string;
  name: string;
  startDate: string;
  yearId: string;
  year?: { id: string; name: string; startDate: string; endDate: string };
};
type GradePlan = {
  categories: { id: string; weight: number; actualPercent: number | null }[];
};
type CategoryMetrics = {
  id: string;
  name: string;
  weightPercent: number;
  actualPercent: number | null;
  contributionPercent: number | null;
  gradedCount: number;
  totalCount: number;
};

export default function CourseCategories() {
  const { courseId } = useParams<{ courseId: string }>();
  const nav = useNavigate();
  const { toast } = useToast();
  const { profile } = useUserProfile();

  const [courseName, setCourseName] = useState("Course");
  const [courseGradingMethod, setCourseGradingMethod] = useState<"WEIGHTED" | "POINTS">("WEIGHTED");
  const [courseSemesterId, setCourseSemesterId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "weight" | "count" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [metrics, setMetrics] = useState<CategoryMetrics[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [semesterList, setSemesterList] = useState<SemesterResponse[]>([]);
  const [semesterCourses, setSemesterCourses] = useState<{ id: string; sortOrder?: number; isDemo?: boolean }[]>([]);
  const [upgradeDialog, setUpgradeDialog] = useState<{ title: string; description: string } | null>(null);

  const tier: UserTier | null = profile?.tier ?? getStoredTier();
  const isFree = tier === "FREE";

  const openUpgradeDialog = (title: string, description: string) => {
    setUpgradeDialog({ title, description });
  };

  const loadData = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const [course, cats, plan, semesters] = await Promise.all([
        http<CourseResponse>(`/courses/${courseId}`),
        http<any[]>(`/courses/${courseId}/categories`),
        http<GradePlan>(`/courses/${courseId}/grade-plan`),
        http<SemesterResponse[]>("/semesters"),
      ]);
      if (course?.name) setCourseName(course.name);
      if (course?.gradingMethod) setCourseGradingMethod(course.gradingMethod);
      if (course?.semesterId) setCourseSemesterId(course.semesterId);
      setSemesterList(semesters ?? []);
      if (course?.semesterId) {
        try {
          const list = await http<{ id: string; sortOrder?: number; isDemo?: boolean }[]>(
            `/semesters/${course.semesterId}/courses`,
          );
          setSemesterCourses(list ?? []);
        } catch {
          setSemesterCourses([]);
        }
      }
      const mapped: Category[] =
        cats?.map((c: any) => ({
          id: c.id,
          name: c.name,
          weightPercent: c.weightPercent,
          dropLowest: c.dropLowest,
          assignmentsCount: c._count?.assignments ?? 0,
          sortOrder: c.sortOrder ?? 0,
        })) ?? [];
      setCategories(mapped);

      const assignmentsByCategory = await Promise.all(
        (cats ?? []).map((cat: any) => http<any[]>(`/categories/${cat.id}/assignments`)),
      );
      const gradedCounts = assignmentsByCategory.map((list) =>
        list.filter((a) => a.grade?.earnedPoints != null || a.grade?.gradedAt != null).length,
      );
      const totalCounts = assignmentsByCategory.map((list) => list.length);
      const totalPointsValue = assignmentsByCategory
        .flat()
        .reduce((sum, assignment) => sum + (assignment.maxPoints ?? 0), 0);
      setTotalPoints(totalPointsValue);
      const planMap = new Map(plan.categories?.map((c) => [c.id, c]) ?? []);
      const nextMetrics: CategoryMetrics[] = mapped.map((cat, index) => {
        const planCat = planMap.get(cat.id);
        const actualPercent = planCat?.actualPercent ?? null;
        const baseWeight =
          course?.gradingMethod === "POINTS" ? (planCat?.weight ?? 0) * 100 : cat.weightPercent;
        const contributionPercent =
          actualPercent !== null ? actualPercent * baseWeight : null;
        return {
          id: cat.id,
          name: cat.name,
          weightPercent: cat.weightPercent,
          actualPercent,
          contributionPercent,
          gradedCount: gradedCounts[index] ?? 0,
          totalCount: totalCounts[index] ?? 0,
        };
      });
      setMetrics(nextMetrics);
    } catch (err) {
      toast({
        title: "Failed to load categories",
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

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    categories.forEach((c) => {
      map[c.id] = c.assignmentsCount ?? 0;
    });
    return map;
  }, [categories]);

  const sortedCategories = useMemo(() => {
    const list = [...categories];
    if (!sortBy) {
      return list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }
    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name) * dir;
      if (sortBy === "weight") return ((a.weightPercent ?? 0) - (b.weightPercent ?? 0)) * dir;
      return ((counts[a.id] ?? 0) - (counts[b.id] ?? 0)) * dir;
    });
    return list;
  }, [categories, counts, sortBy, sortDir]);

  const totalWeight = useMemo(
    () => categories.reduce((sum, c) => sum + (c.weightPercent ?? 0), 0),
    [categories],
  );
  const totalAssignments = useMemo(
    () => metrics.reduce((sum, m) => sum + m.totalCount, 0),
    [metrics],
  );
  const metricsMap = useMemo(() => new Map(metrics.map((m) => [m.id, m])), [metrics]);
  const isPointsBased = courseGradingMethod === "POINTS";
  const freeLimits = { years: 1, semesters: 1, courses: 3 };
  const courseLimit = profile?.limits?.courses ?? freeLimits.courses;
  const yearsFromSemesters = useMemo(() => {
    const map = new Map<string, SemesterResponse["year"]>();
    semesterList.forEach((semester) => {
      if (semester.year) {
        map.set(semester.year.id, semester.year);
      }
    });
    return Array.from(map.values()).filter((year): year is NonNullable<SemesterResponse["year"]> => !!year);
  }, [semesterList]);
  const sortedYearsByStart = useMemo(() => {
    return [...yearsFromSemesters].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );
  }, [yearsFromSemesters]);
  const allowedYearId = isFree ? sortedYearsByStart[0]?.id ?? null : null;
  const allowedSemesterId = useMemo(() => {
    if (!isFree) return null;
    const candidates = semesterList.filter((semester) =>
      allowedYearId ? semester.yearId === allowedYearId : true,
    );
    const sorted = [...candidates].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );
    return sorted[0]?.id ?? null;
  }, [allowedYearId, isFree, semesterList]);
  const allowedCourseIds = useMemo(() => {
    if (!isFree || !allowedSemesterId) return new Set<string>();
    const sorted = [...semesterCourses]
      .filter((course) => !course.isDemo)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return new Set(sorted.slice(0, courseLimit).map((course) => course.id));
  }, [allowedSemesterId, courseLimit, isFree, semesterCourses]);
  const isCourseLocked = useMemo(() => {
    if (!isFree || !courseId) return false;
    if (!allowedSemesterId || courseSemesterId !== allowedSemesterId) return true;
    if (allowedCourseIds.size === 0) return false;
    return !allowedCourseIds.has(courseId);
  }, [allowedCourseIds, allowedSemesterId, courseId, courseSemesterId, isFree]);

  const toggleSort = (col: "name" | "weight" | "count") => {
    if (sortBy === col) setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortDir("asc");
    }
  };
  const persistCategoryOrder = async (ordered: Category[]) => {
    if (isFree && isCourseLocked) {
      openUpgradeDialog(
        "Course locked on Free",
        "Upgrade to reorder categories on locked courses.",
      );
      return;
    }
    try {
      await http(`/categories/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ orderedIds: ordered.map((c) => c.id) }),
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
    if (isFree && isCourseLocked) {
      openUpgradeDialog(
        "Course locked on Free",
        "Upgrade to reorder categories on locked courses.",
      );
      setDraggingId(null);
      return;
    }
    const list = [...categories];
    const fromIndex = list.findIndex((c) => c.id === draggingId);
    const toIndex = list.findIndex((c) => c.id === targetId);
    if (fromIndex === -1 || toIndex === -1) {
      setDraggingId(null);
      return;
    }
    const [item] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, item);
    const ordered = list.map((category, index) => ({ ...category, sortOrder: index + 1 }));
    setCategories(ordered);
    setSortBy(null);
    void persistCategoryOrder(ordered);
    setDraggingId(null);
  };

  const openAdd = () => {
    if (isFree && isCourseLocked) {
      openUpgradeDialog(
        "Course locked on Free",
        "Upgrade to add categories on locked courses.",
      );
      return;
    }
    setEditingCategory(null);
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    if (isFree && isCourseLocked) {
      openUpgradeDialog(
        "Course locked on Free",
        "Upgrade to edit categories on locked courses.",
      );
      return;
    }
    setEditingCategory(cat);
    setModalOpen(true);
  };

  const handleSave = async (data: CategoryFormData) => {
    if (!courseId) return;
    if (isFree && isCourseLocked) {
      openUpgradeDialog(
        "Course locked on Free",
        "Upgrade to edit categories on locked courses.",
      );
      return;
    }
    try {
      if (editingCategory) {
        await http(`/categories/${editingCategory.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: data.name,
            weightPercent: data.weight,
            dropLowest: data.dropLowest ? data.dropCount : 0,
          }),
        });
        toast({ title: "Category updated", description: data.name });
      } else {
        await http(`/courses/${courseId}/categories`, {
          method: "POST",
          body: JSON.stringify({
            name: data.name,
            weightPercent: data.weight,
            dropLowest: data.dropLowest ? data.dropCount : 0,
          }),
        });
        toast({ title: "Category added", description: data.name });
      }
      setEditingCategory(null);
      setModalOpen(false);
      await loadData();
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteCategory) return;
    if (isFree && isCourseLocked) {
      openUpgradeDialog(
        "Course locked on Free",
        "Upgrade to delete categories on locked courses.",
      );
      return;
    }
    try {
      await http(`/categories/${confirmDeleteCategory.id}`, { method: "DELETE" });
      toast({ title: "Category deleted", description: confirmDeleteCategory.name });
      setConfirmDeleteCategory(null);
      setModalOpen(false);
      await loadData();
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const signOut = () => {
    localStorage.clear();
    nav("/auth?mode=login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-slate-50 pb-12">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/academic-year" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground hidden sm:block">AY Grade</span>
            </Link>
            <span className="text-slate-400">›</span>
            <Link to={`/courses/${courseId}`} className="font-semibold text-slate-700 hover:text-primary">
              {courseName}
            </Link>
            <span className="text-slate-400">›</span>
            <span className="font-semibold text-slate-700">Categories</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => nav("/docs")}>
              <HelpCircle className="h-5 w-5" />
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
                <DropdownMenuItem onClick={() => nav("/profile")}>
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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {isCourseLocked ? (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex items-center gap-3 py-4 text-sm text-amber-900">
              <Lock className="h-4 w-4" />
              This course is locked on the Free tier. Upgrade to edit categories.
            </CardContent>
          </Card>
        ) : null}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-2xl border border-slate-200 bg-white/90 shadow-md backdrop-blur px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-primary font-semibold">Course</p>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{courseName}</h1>
              {isCourseLocked ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  <Lock className="h-3 w-3" />
                  Locked
                </span>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">Edit category weights and drop rules for this course.</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => nav(`/courses/${courseId}`)}>
            Back to course
          </Button>
        </div>
        <Card className="border-slate-200 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl">Manage categories</CardTitle>
            <Button
              className="gap-2 bg-success text-white hover:bg-success/90"
              onClick={openAdd}
            >
              <Plus className="h-4 w-4" />
              Add category
            </Button>
          </CardHeader>
          <CardContent className="overflow-hidden">
            <div className="grid grid-cols-[48px_1fr_100px_120px_140px_120px_120px] bg-slate-50 text-sm font-semibold text-slate-600 rounded-t-lg border border-slate-200">
              <div className="px-4 py-3 flex items-center">
                <span className="sr-only">Drag</span>
              </div>
              <button className="px-4 py-3 text-left flex items-center gap-1 hover:text-primary" onClick={() => toggleSort("name")}>
                Name {sortBy === "name" && <ChevronDown className={`h-4 w-4 ${sortDir === "asc" ? "-rotate-180" : ""}`} />}
              </button>
              <button className="px-4 py-3 text-left flex items-center gap-1 hover:text-primary" onClick={() => toggleSort("weight")}>
                {isPointsBased ? "Weight (ignored)" : "Weight"}{" "}
                {sortBy === "weight" && <ChevronDown className={`h-4 w-4 ${sortDir === "asc" ? "-rotate-180" : ""}`} />}
              </button>
              <div className="px-4 py-3 text-right">Contribution</div>
              <div className="px-4 py-3 text-right">Category %</div>
              <div className="px-4 py-3 text-right">Graded</div>
              <button className="px-4 py-3 text-right flex items-center gap-1 justify-end hover:text-primary" onClick={() => toggleSort("count")}>
                Total {sortBy === "count" && <ChevronDown className={`h-4 w-4 ${sortDir === "asc" ? "-rotate-180" : ""}`} />}
              </button>
            </div>
            <div className="divide-y divide-slate-200 border border-t-0 border-slate-200 rounded-b-lg">
              {sortedCategories.map((cat) => (
                <div
                  key={cat.id}
                  className={`grid grid-cols-[48px_1fr_100px_120px_140px_120px_120px] items-center bg-white hover:bg-slate-50 transition-colors ${draggingId === cat.id ? "opacity-75" : ""}`}
                  draggable={!isFree || !isCourseLocked}
                  onDragStart={() => {
                    if (isFree && isCourseLocked) return;
                    setDraggingId(cat.id);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(cat.id)}
                  onClick={() => openEdit(cat)}
                >
                  <div className="px-4 py-3 flex items-center text-slate-400" onClick={(e) => e.stopPropagation()}>
                    <GripVertical className="h-5 w-5" />
                  </div>
                  <div className="px-4 py-3 text-left font-semibold text-foreground">
                    {cat.name}
                  </div>
                  <div className="px-4 py-3 text-muted-foreground">
                    {isPointsBased ? "—" : `${cat.weightPercent}%`}
                  </div>
                  <div className="px-4 py-3 text-right text-muted-foreground">
                    {metricsMap.get(cat.id)?.contributionPercent === null || metricsMap.get(cat.id)?.contributionPercent === undefined
                      ? "—"
                      : `${metricsMap.get(cat.id)?.contributionPercent?.toFixed(1)}%`}
                  </div>
                  <div className="px-4 py-3 text-right text-muted-foreground">
                    {metricsMap.get(cat.id)?.actualPercent === null || metricsMap.get(cat.id)?.actualPercent === undefined
                      ? "—"
                      : `${Math.round((metricsMap.get(cat.id)?.actualPercent ?? 0) * 100)}%`}
                  </div>
                  <div className="px-4 py-3 text-right text-muted-foreground">
                    {metricsMap.get(cat.id)?.gradedCount ?? 0}
                  </div>
                  <div className="px-4 py-3 text-right font-semibold">{counts[cat.id] ?? 0}</div>
                </div>
              ))}
              {categories.length === 0 && (
                <div className="px-4 py-3 text-sm text-muted-foreground col-span-7">No categories yet.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-md bg-white/90">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Category summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-[auto_1fr_1fr] sm:items-center">
            {isPointsBased ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-5 text-center">
                <p className="text-sm text-muted-foreground">Total Points</p>
                <p className="text-3xl font-bold text-foreground">{Math.round(totalPoints)}</p>
              </div>
            ) : (
              <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <div
                  className="flex h-24 w-24 items-center justify-center rounded-full"
                  style={{
                    background: `conic-gradient(#10b981 ${Math.min(100, Math.round(totalWeight))}%, #e2e8f0 0)`,
                  }}
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-lg font-bold text-foreground">
                    {Math.round(totalWeight)}%
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total category weight</p>
                  <p className="text-xs text-muted-foreground">Target is 100%</p>
                </div>
              </div>
            )}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-center">
              <p className="text-sm text-muted-foreground">Total Categories</p>
              <p className="text-2xl font-bold text-foreground">{categories.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-right">
              <p className="text-sm text-muted-foreground">Total Assignments</p>
              <p className="text-2xl font-bold text-foreground">{totalAssignments}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <UpgradeDialog
        open={!!upgradeDialog}
        onOpenChange={(open) => !open && setUpgradeDialog(null)}
        title={upgradeDialog?.title ?? "Upgrade required"}
        description={upgradeDialog?.description ?? "Upgrade to unlock this action."}
        onAction={() => {
          setUpgradeDialog(null);
          nav("/profile");
        }}
      />

      <CategoryModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={handleSave}
        gradingMethod={courseGradingMethod}
        onDelete={
          editingCategory
            ? () => {
                setConfirmDeleteCategory(editingCategory);
              }
            : undefined
        }
        initialData={
          editingCategory
            ? {
                name: editingCategory.name,
                weight: editingCategory.weightPercent,
                dropLowest: (editingCategory.dropLowest ?? 0) > 0,
                dropCount: editingCategory.dropLowest ?? 0,
              }
            : undefined
        }
      />

      <AlertDialog open={!!confirmDeleteCategory} onOpenChange={(open) => !open && setConfirmDeleteCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDeleteCategory?.name}?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground">Assignments will remain but lose their category tag.</p>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDeleteCategory(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete}>
              Delete category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
