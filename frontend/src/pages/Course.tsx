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
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CourseModal } from "@/components/modals";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { useToast } from "@/hooks/use-toast";
import { getStoredTier, useUserProfile, type UserTier } from "@/hooks/use-user-profile";
import { http } from "@/lib/http";
import { incrementOnboardingAssignmentCount, setOnboardingAssignmentCount } from "@/lib/onboarding";
import {
  AlertTriangle,
  HelpCircle,
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
  Lock,
} from "lucide-react";

type Assignment = {
  id: string;
  name: string;
  earned?: number;
  expected?: number;
  isDropped?: boolean;
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
  gradingMethod?: "WEIGHTED" | "POINTS";
  actualPercentGrade?: number | null;
  actualLetterGrade?: string | null;
  actualPointsLeftToLose?: number | null;
  gradeFinalizedAt?: string | null;
  code?: string;
  isCompleted?: boolean;
  semesterId?: string;
};
type SemesterResponse = {
  id: string;
  name: string;
  startDate: string;
  yearId: string;
  year?: { id: string; name: string; startDate: string; endDate: string };
};
type Category = { id: string; name: string; weightPercent: number; dropLowest?: number; assignmentsCount?: number };
type GradePlan = {
  actualPercent: number | null;
  projectedPercent: number | null;
  requirements: { id: string; requiredPoints: number }[];
  droppedAssignmentIds: string[];
};
type TargetGpaSession = {
  id: string;
  scope: "CAREER" | "YEAR" | "SEMESTER";
  targetGpa: number;
  yearId?: string | null;
  semesterId?: string | null;
};

const gradeTargets: Record<string, number> = {
  A: 90,
  B: 80,
  C: 70,
  D: 60,
  F: 0,
};

const LAST_SEMESTER_KEY = "ayg_last_semester_id";

const gradeBadgeClasses: Record<string, string> = {
  A: "from-primary to-primary-dark",
  B: "from-success to-success/70",
  C: "from-warning to-warning/70",
  D: "from-amber-500 to-amber-700",
  F: "from-destructive to-destructive/70",
};

const options = ["A", "B", "C", "D", "F"];

const getYearForSemester = (semesters: SemesterResponse[], semesterId: string) =>
  semesters.find((semester) => semester.id === semesterId)?.year ?? null;

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
  const { profile } = useUserProfile();
  const [courseName, setCourseName] = useState("Calculus I");
  const [courseCode, setCourseCode] = useState("");
  const [courseCredits, setCourseCredits] = useState(3);
  const [courseGradingMethod, setCourseGradingMethod] = useState<"WEIGHTED" | "POINTS">("WEIGHTED");
  const [courseCompleted, setCourseCompleted] = useState(false);
  const [semesterName, setSemesterName] = useState("Semester");
  const [courseSemesterId, setCourseSemesterId] = useState<string | null>(null);
  const [semesterList, setSemesterList] = useState<SemesterResponse[]>([]);
  const [semesterCourses, setSemesterCourses] = useState<{ id: string; sortOrder?: number; isDemo?: boolean }[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>("A");
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const [form, setForm] = useState<AssignmentForm | null>(null);
  const [confirmDeleteAssignment, setConfirmDeleteAssignment] = useState<AssignmentForm | null>(null);
  const [mode, setMode] = useState<"edit" | "add">("edit");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editCourseOpen, setEditCourseOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [targetGpaSessions, setTargetGpaSessions] = useState<TargetGpaSession[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "earned" | "expected" | "category" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(false);
  const [actualPercent, setActualPercent] = useState<number | null>(null);
  const { toast } = useToast();
  const [categoryLocked, setCategoryLocked] = useState(false);
  const [maxLocked, setMaxLocked] = useState(false);
  const [upgradeDialog, setUpgradeDialog] = useState<{ title: string; description: string } | null>(null);

  const tier: UserTier | null = profile?.tier ?? getStoredTier();
  const isFree = tier === "FREE";

  const openUpgradeDialog = (title: string, description: string) => {
    setUpgradeDialog({ title, description });
  };

  const clearExpectedPoints = useCallback(() => {
    setAssignments((prev) =>
      prev.map((assignment) => ({
        ...assignment,
        expected: assignment.earned === undefined ? undefined : assignment.expected,
      })),
    );
  }, []);

  const computePointsLeftToLose = useCallback(
    (list: Assignment[], targetLetter: string) => {
      if (!list.length) return null;
      const target = gradeTargets[targetLetter] ?? 90;
      const total = list.reduce((sum, a) => sum + a.max, 0);
      if (total === 0) return null;
      const targetPoints = (target / 100) * total;
      const lostSoFar = list.reduce((sum, a) => {
        if (a.earned === undefined) return sum;
        return sum + Math.max(a.max - a.earned, 0);
      }, 0);
      const left = total - targetPoints - lostSoFar;
      return Math.max(Math.round(left), 0);
    },
    [],
  );

  const percentToLetter = (percent: number) => {
    if (percent >= gradeTargets.A) return "A";
    if (percent >= gradeTargets.B) return "B";
    if (percent >= gradeTargets.C) return "C";
    if (percent >= gradeTargets.D) return "D";
    return "F";
  };

  const persistActualGrade = async (percent: number | null, pointsLeft: number | null) => {
    if (!courseId) return;
    try {
      await http(`/courses/${courseId}`, {
        method: "PATCH",
        body: JSON.stringify({
          actualPercentGrade: percent,
          actualLetterGrade: percent === null ? null : percentToLetter(percent),
          actualPointsLeftToLose: pointsLeft,
        }),
      });
    } catch (err) {
      // keep UI responsive even if persistence fails
    }
  };

  const refreshActualGrade = async () => {
    if (!courseId) return;
    try {
      const plan = await http<GradePlan>(`/courses/${courseId}/grade-plan?desiredGrade=${selectedGrade}`);
      setActualPercent(plan.actualPercent);
      const percentValue = plan.actualPercent !== null ? Math.round(plan.actualPercent * 100) : null;
      await persistActualGrade(percentValue, null);
    } catch (err) {
      // ignore for now; grade plan errors handled elsewhere
    }
  };

  const loadData = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const [course, cats, semesters, targetSessions] = await Promise.all([
        http<CourseResponse>(`/courses/${courseId}`),
        http<any[]>(`/courses/${courseId}/categories`),
        http<SemesterResponse[]>("/semesters"),
        http<TargetGpaSession[]>("/target-gpa/active"),
      ]);
      if (course?.name) setCourseName(course.name);
      if (course?.credits !== undefined) setCourseCredits(course.credits);
      if (course?.code !== undefined) setCourseCode(course.code);
      const desiredGrade = (course as any)?.desiredLetterGrade ?? selectedGrade;
      if (desiredGrade) setSelectedGrade(desiredGrade);
      if (course?.gradingMethod) setCourseGradingMethod(course.gradingMethod);
      if (course?.isCompleted !== undefined) setCourseCompleted(course.isCompleted);
      if (course?.semesterId) setCourseSemesterId(course.semesterId);
      setTargetGpaSessions(targetSessions ?? []);
      if ((course as any)?.actualPercentGrade !== undefined && (course as any)?.actualPercentGrade !== null) {
        setActualPercent((course as any).actualPercentGrade / 100);
      }

      if (semesters?.length) {
        setSemesterList(semesters);
        const match = course?.semesterId
          ? semesters.find((s) => s.id === course.semesterId)
          : undefined;
        const fallback = localStorage.getItem(LAST_SEMESTER_KEY);
        const fallbackMatch = fallback ? semesters.find((s) => s.id === fallback) : undefined;
        setSemesterName(match?.name ?? fallbackMatch?.name ?? semesters[0].name);
      }
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
          isDropped: false,
          isExtraCredit: a.isExtraCredit ?? false,
          sortOrder: a.sortOrder ?? 0,
        }))
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      setAssignments(mappedAssignments);
      setOnboardingAssignmentCount(mappedAssignments.length);

      // load grade plan for current target to hydrate expected for remaining
      const plan = await http<GradePlan>(`/courses/${courseId}/grade-plan?desiredGrade=${desiredGrade}`);
      setActualPercent(plan.actualPercent);
      if (hasRun) {
        setAssignments((prev) =>
          prev.map((a) => {
            const req = plan.requirements?.find((r) => r.id === a.id);
            const isDropped = plan.droppedAssignmentIds?.includes(a.id) ?? false;
            if (a.earned !== undefined) return { ...a, isDropped };
            return { ...a, expected: req ? req.requiredPoints : undefined, isDropped };
          }),
        );
      } else {
        setAssignments((prev) =>
          prev.map((a) => ({
            ...a,
            expected: a.earned === undefined ? undefined : a.expected,
            isDropped: false,
          })),
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

  const courseYear = useMemo(() => {
    if (!courseSemesterId || !semesterList.length) return null;
    return getYearForSemester(semesterList, courseSemesterId);
  }, [courseSemesterId, semesterList]);
  const courseYearId = courseYear?.id ?? null;
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

  const careerTargetSession =
    targetGpaSessions.find((session) => session.scope === "CAREER") ?? null;
  const yearTargetSession =
    courseYearId
      ? targetGpaSessions.find(
          (session) => session.scope === "YEAR" && session.yearId === courseYearId,
        ) ?? null
      : null;
  const semesterTargetSession =
    courseSemesterId
      ? targetGpaSessions.find(
          (session) => session.scope === "SEMESTER" && session.semesterId === courseSemesterId,
        ) ?? null
      : null;
  const targetGpaLockedForCourse =
    !!careerTargetSession || !!yearTargetSession || !!semesterTargetSession;

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
  const currentPercent = gradedMaxPoints === 0 ? 0 : Math.round((earnedPoints / gradedMaxPoints) * 100);
  const actualPercentValue = actualPercent !== null ? Math.round(actualPercent * 100) : currentPercent;
  const actualLetter = useMemo(() => {
    if (actualPercentValue >= gradeTargets.A) return "A";
    if (actualPercentValue >= gradeTargets.B) return "B";
    if (actualPercentValue >= gradeTargets.C) return "C";
    if (actualPercentValue >= gradeTargets.D) return "D";
    return "F";
  }, [actualPercentValue]);
  const heroLetter = assignments.length === 0 || gradedCount === 0 ? "A" : actualLetter;
  const currentGradeLetter = gradedCount === 0 ? "-" : actualLetter;
  const currentGradeBadge = gradedCount === 0 ? "A" : actualLetter;
  const currentGradePercent =
    gradedCount === 0 ? "-" : `${actualPercent !== null ? Math.round(actualPercent * 100) : currentPercent}%`;
  const gradedAvgPercent = useMemo(() => {
    const graded = assignments.filter((a) => a.earned !== undefined && a.max > 0);
    if (graded.length === 0) return null;
    const avg = graded.reduce((sum, a) => sum + a.earned! / a.max, 0) / graded.length;
    return Math.max(0, Math.min(1, avg));
  }, [assignments]);

  const pointsLeftToLose = useMemo(() => {
    if (!hasRun) return null;
    return computePointsLeftToLose(assignments, selectedGrade);
  }, [assignments, computePointsLeftToLose, hasRun, selectedGrade]);

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
    if (!hasRun) return null;
    if (remainingMaxPoints <= 0) return null;
    const avg = neededPoints / remainingMaxPoints;
    return Math.max(0, Math.min(1, avg));
  }, [hasRun, neededPoints, remainingMaxPoints]);

  const targetMet = hasRun && neededPoints <= 0;

  const riskLevel =
    pointsLeftToLose === null ? "none" : pointsLeftToLose < 10 ? "danger" : pointsLeftToLose < 50 ? "caution" : "safe";
  const riskLabel =
    riskLevel === "none" ? "—" : riskLevel === "safe" ? "Safe" : riskLevel === "caution" ? "Caution" : "Danger";

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
    if (isFree && isCourseLocked) {
      openUpgradeDialog(
        "Course locked on Free",
        "Upgrade to edit assignments on locked courses.",
      );
      return;
    }
    setMode("edit");
    setForm(toForm(assignment));
    setCategoryLocked(true);
    setMaxLocked(true);
    if (hasRun) {
      clearExpectedPoints();
      setHasRun(false);
      setLastRun(null);
    }
  };

  const openCreate = () => {
    if (isFree && isCourseLocked) {
      openUpgradeDialog(
        "Course locked on Free",
        "Upgrade to add assignments on locked courses.",
      );
      return;
    }
    if (!categories.length && courseGradingMethod !== "POINTS") {
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
    setCategoryLocked(false);
    setMaxLocked(false);
    if (hasRun) {
      clearExpectedPoints();
      setHasRun(false);
      setLastRun(null);
    }
  };

  const saveAssignment = async () => {
    if (isFree && isCourseLocked) {
      openUpgradeDialog(
        "Course locked on Free",
        "Upgrade to edit assignments on locked courses.",
      );
      return;
    }
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
        incrementOnboardingAssignmentCount(1);
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
      if (hasRun) {
        clearExpectedPoints();
        setHasRun(false);
        setLastRun(null);
      }
      await refreshActualGrade();
    } catch (err) {
      // toast handled in helpers when appropriate
    } finally {
      setForm(null);
    }
  };

  const deleteAssignment = async (id: string) => {
    if (isFree && isCourseLocked) {
      openUpgradeDialog(
        "Course locked on Free",
        "Upgrade to delete assignments on locked courses.",
      );
      return;
    }
    try {
      await http(`/assignments/${id}`, { method: "DELETE" });
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      setForm(null);
      if (hasRun) {
        clearExpectedPoints();
        setHasRun(false);
        setLastRun(null);
      }
      await refreshActualGrade();
      toast({ title: "Assignment deleted" });
    } catch (err) {
      toast({
        title: "Failed to delete assignment",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmDeleteAssignment = async () => {
    if (!confirmDeleteAssignment) return;
    await deleteAssignment(confirmDeleteAssignment.id);
    setConfirmDeleteAssignment(null);
  };

  const runSimulation = async () => {
    if (!courseId) return;
    if (isFree && isCourseLocked) {
      openUpgradeDialog(
        "Course locked on Free",
        "Upgrade to run simulations on locked courses.",
      );
      return;
    }
    try {
      setHasRun(true);
      const plan = await http<GradePlan>(`/courses/${courseId}/grade-plan?desiredGrade=${selectedGrade}`);
      setActualPercent(plan.actualPercent);
      setAssignments((prev) =>
        prev.map((a) => {
          const req = plan.requirements?.find((r) => r.id === a.id);
          const isDropped = plan.droppedAssignmentIds?.includes(a.id) ?? false;
          if (a.earned !== undefined) return { ...a, isDropped };
          return { ...a, expected: req ? req.requiredPoints : undefined, isDropped };
        }),
      );
      const percentValue = plan.actualPercent !== null ? Math.round(plan.actualPercent * 100) : null;
      const pointsLeft = computePointsLeftToLose(assignments, selectedGrade);
      await persistActualGrade(percentValue, pointsLeft);
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

  const handleCourseSave = (data: {
    name: string;
    code: string;
    credits: number;
    targetGrade: string;
    gradingMethod: "WEIGHTED" | "POINTS";
    isCompleted?: boolean;
  }) => {
    if (isFree && isCourseLocked) {
      openUpgradeDialog(
        "Course locked on Free",
        "Upgrade to edit additional courses.",
      );
      return;
    }
    if (courseId) {
      const payload: {
        name: string;
        code: string;
        credits: number;
        gradingMethod: "WEIGHTED" | "POINTS";
        desiredLetterGrade?: string;
        isCompleted: boolean;
      } = {
        name: data.name,
        code: data.code,
        credits: data.credits,
        gradingMethod: data.gradingMethod,
        isCompleted: data.isCompleted ?? false,
      };
      if (!targetGpaLockedForCourse) {
        payload.desiredLetterGrade = data.targetGrade;
      }
      http(`/courses/${courseId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }).catch(() => undefined);
    }
    setCourseName(data.name);
    setSelectedGrade(data.targetGrade);
    setCourseCredits(data.credits);
    setCourseCode(data.code);
    setCourseGradingMethod(data.gradingMethod);
    setCourseCompleted(data.isCompleted ?? false);
    void loadData();
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
    if (isFree) {
      openUpgradeDialog(
        "Delete locked on Free",
        "Upgrade to delete courses.",
      );
      return;
    }
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

  const handleNameChange = (value: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const next = { ...prev, name: value };
      if (mode === "add" && !categoryLocked) {
        const suggested = suggestCategoryId(value);
        if (suggested) next.categoryId = suggested;
      }
      if (mode === "add" && !maxLocked) {
        const suggestedMax = suggestMaxPoints(next.categoryId);
        if (suggestedMax !== null) next.max = suggestedMax.toString();
      }
      return next;
    });
  };

  const suggestMaxPoints = (categoryId: string) => {
    if (!categoryId) return null;
    const values = assignments
      .filter((assignment) => assignment.categoryId === categoryId)
      .map((assignment) => assignment.max)
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

  const handleCategoryChange = (value: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const next = { ...prev, categoryId: value };
      if (mode === "add" && !maxLocked) {
        const suggestedMax = suggestMaxPoints(value);
        if (suggestedMax !== null) next.max = suggestedMax.toString();
      }
      return next;
    });
    setCategoryLocked(true);
  };

  const handleMaxChange = (value: string) => {
    setMaxLocked(true);
    setForm((prev) => (prev ? { ...prev, max: value } : prev));
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
            <Link to="/dashboard" className="font-semibold text-slate-700 hover:text-primary">
              {semesterName}
            </Link>
            <span className="text-slate-400">›</span>
            <span className="font-semibold text-slate-700">{courseName}</span>
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {isCourseLocked ? (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex items-center gap-3 py-4 text-sm text-amber-900">
              <Lock className="h-4 w-4" />
              This course is locked on the Free tier. Upgrade to edit or delete it.
            </CardContent>
          </Card>
        ) : null}
        <div className="sticky top-16 z-30">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/90 shadow-md backdrop-blur">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-5 py-4">
              <div className="flex items-center gap-4">
                <div
                  className={`h-12 w-12 rounded-xl bg-gradient-to-br text-white font-bold grid place-items-center shadow-lg ${gradeBadgeClasses[heroLetter] ?? "from-primary to-primary-dark"}`}
                >
                  {heroLetter}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-primary font-semibold">Course</p>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-foreground">{courseName}</h1>
                    {isCourseLocked ? (
                      <Badge variant="outline" className="flex items-center gap-1 text-xs">
                        <Lock className="h-3 w-3" />
                        Locked
                      </Badge>
                    ) : null}
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
                            if (isFree && isCourseLocked) {
                              openUpgradeDialog(
                                "Course locked on Free",
                                "Upgrade to edit additional courses.",
                              );
                              return;
                            }
                            setEditCourseOpen(true);
                          }}
                        >
                          Edit course
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setMenuOpen(false);
                            if (isFree && isCourseLocked) {
                              openUpgradeDialog(
                                "Course locked on Free",
                                "Upgrade to manage categories on locked courses.",
                              );
                              return;
                            }
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
                            if (isFree) {
                              openUpgradeDialog(
                                "Delete locked on Free",
                                "Upgrade to delete courses.",
                              );
                              return;
                            }
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
              <div className="flex items-end gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-muted-foreground">Target grade</span>
                  <Select
                    value={selectedGrade}
                    onValueChange={(value) => setSelectedGrade(value)}
                    disabled={!!targetGpaLockedForCourse || (isFree && isCourseLocked)}
                  >
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
                  {targetGpaLockedForCourse ? (
                    <span className="text-[10px] text-muted-foreground">
                      Target grade is controlled by your GPA setting.
                    </span>
                  ) : isFree && isCourseLocked ? (
                    <span className="text-[10px] text-muted-foreground">
                      Locked on the Free tier.
                    </span>
                  ) : null}
                </div>
                <Button className="gap-2" onClick={runSimulation}>
                  <Play className="h-4 w-4" />
                  Run
                </Button>
              </div>
            </div>
            <div className="flex justify-center px-5 pb-4">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  className="gap-2 bg-[#faf1e4] text-[#343434] hover:bg-[#f3e5d3]"
                  onClick={() => {
                    if (isFree && isCourseLocked) {
                      openUpgradeDialog(
                        "Course locked on Free",
                        "Upgrade to manage categories on locked courses.",
                      );
                      return;
                    }
                    nav(`/courses/${courseId}/categories`);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                  Manage categories
                </Button>
                <Button
                  className="gap-2 bg-[#265D80] text-white hover:bg-[#1f4d6a]"
                  onClick={openCreate}
                  disabled={loading || (!categories.length && courseGradingMethod !== "POINTS")}
                >
                  <Plus className="h-4 w-4" />
                  Add assignment
                </Button>
              </div>
            </div>
          </div>
        </div>

        {categories.length === 0 ? (
          <Card className="bg-muted/30 border-dashed">
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm">
                {courseGradingMethod === "POINTS" ? "No assignments yet" : "No categories yet"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {courseGradingMethod === "POINTS" ? (
                <Button variant="outline" onClick={openCreate}>
                  Add your first assignment
                </Button>
              ) : (
                <Button variant="outline" onClick={() => nav(`/courses/${courseId}/categories`)}>
                  Add your first category
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200 shadow-lg">
            <CardContent className="p-6 overflow-hidden">
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
                    onClick={() => openEditor(assignment)}
                  >
                    <div
                      className="col-span-1 px-4 py-3 flex items-center text-slate-400"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <GripVertical className="h-5 w-5" />
                    </div>
                    <div className="col-span-4 px-4 py-3">
                      <span className="flex items-center gap-2 text-left font-semibold transition-colors">
                        <span className={assignment.isDropped ? "line-through text-muted-foreground" : "text-foreground"}>
                          {assignment.name}
                        </span>
                        {assignment.isDropped && (
                          <Badge className="rounded-full bg-destructive/15 text-destructive border-destructive/40 px-2 py-0.5 text-[10px]">
                            Dropped
                          </Badge>
                        )}
                        {assignment.isExtraCredit && (
                          <Badge className="rounded-full bg-success/20 text-success border-success/30 px-2 py-0.5 text-[10px]">
                            EC
                          </Badge>
                        )}
                      </span>
                    </div>
                    <div
                      className={`col-span-3 px-4 py-3 ${
                        assignment.isDropped ? "text-muted-foreground/60 line-through" : "text-muted-foreground"
                      }`}
                    >
                      {assignment.earned === undefined ? "—" : formatScore(assignment.earned, assignment.max)}
                    </div>
                    <div
                      className={`col-span-2 px-4 py-3 font-semibold ${
                        assignment.isDropped ? "text-muted-foreground/60" : "text-primary"
                      }`}
                    >
                      {assignment.expected === undefined ? "—" : formatScore(assignment.expected, assignment.max)}
                    </div>
                    <div
                      className={`col-span-2 px-4 py-3 font-semibold ${
                        assignment.isDropped ? "text-muted-foreground/60" : "text-muted-foreground"
                      }`}
                    >
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
                className={`h-12 w-12 rounded-full bg-gradient-to-br text-white font-bold grid place-items-center shadow-lg ${gradeBadgeClasses[currentGradeBadge] ?? ""}`}
              >
                {currentGradeLetter}
              </div>
              <div>
                <p className="text-4xl font-bold text-foreground leading-none">
                  {currentGradePercent}
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
                  pointsLeftToLose === null
                    ? "text-foreground"
                    : pointsLeftToLose < 10
                    ? "text-destructive"
                    : pointsLeftToLose < 50
                      ? "text-warning"
                      : "text-foreground"
                }`}
              >
                {pointsLeftToLose === null ? "—" : `${pointsLeftToLose} pts`}
              </p>
              <p className="text-sm text-muted-foreground px-2">
                {!hasRun
                  ? "Run the simulation to see your target buffer."
                  : pointsLeftToLose === null
                    ? "Add assignments to see your target buffer."
                    : pointsLeftToLose === 0
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
                {!hasRun ? (
                  <>
                    <AlertTriangle className="h-4 w-4 text-slate-400" />
                    <span>Run to see status</span>
                  </>
                ) : pointsLeftToLose === null ? (
                  <>
                    <AlertTriangle className="h-4 w-4 text-slate-400" />
                    <span>Waiting on grades</span>
                  </>
                ) : pointsLeftToLose > 0 ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span>On Track</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span>At risk</span>
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
                          : riskLevel === "danger"
                            ? "text-destructive"
                            : "text-muted-foreground"
                    }`}
                  >
                    {riskLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Avg on graded</span>
                  <span className="font-semibold text-foreground">
                    {!hasRun || gradedAvgPercent === null ? "—" : `${Math.round(gradedAvgPercent * 100)}%`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Needed avg per assignment</span>
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
                <Input value={form.name} onChange={(e) => handleNameChange(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={form.categoryId}
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
                    onChange={(e) => handleMaxChange(e.target.value)}
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
              <Button variant="destructive" onClick={() => setConfirmDeleteAssignment(form)}>
                Delete
              </Button>
            )}
            <div className="flex-1" />
            <Button
              onClick={saveAssignment}
              className={mode === "edit" ? "bg-[#16A286] text-white hover:bg-[#138a72]" : undefined}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!confirmDeleteAssignment}
        onOpenChange={(open) => !open && setConfirmDeleteAssignment(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the assignment and any recorded grade.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleConfirmDeleteAssignment}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      <OnboardingChecklist />
      <CourseModal
        open={editCourseOpen}
        onOpenChange={setEditCourseOpen}
        onSubmit={handleCourseSave}
        targetGpaLocked={!!targetGpaLockedForCourse}
        initialData={{
          name: courseName,
          code: courseCode,
          credits: courseCredits,
          targetGrade: selectedGrade,
          gradingMethod: courseGradingMethod,
          isCompleted: courseCompleted,
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
