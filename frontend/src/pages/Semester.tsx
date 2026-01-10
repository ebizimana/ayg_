import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressRing } from "@/components/ProgressRing";
import { CourseCard } from "@/components/CourseCard";
import { StatCard } from "@/components/StatCard";
import {
  SemesterModal,
  CourseModal,
  type SemesterFormData,
  type CourseFormData,
  CategoryModal,
  AssignmentModal,
  GradeModal,
  type CategoryFormData,
  type AssignmentFormData,
  type GradeFormData,
} from "@/components/modals";
import {
  GraduationCap,
  Plus,
  BookOpen,
  Target,
  TrendingUp,
  Calendar,
  ChevronDown,
  LogOut,
  User,
  Settings,
  Bell,
  Menu,
  X,
  Sparkles,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { http } from "@/lib/http";

type Semester = { id: string; name: string; startDate: string; endDate: string };
type Course = {
  id: string;
  name: string;
  code?: string;
  credits: number;
  desiredLetterGrade: string;
  gradingMethod?: "WEIGHTED" | "POINTS";
  actualLetterGrade?: string | null;
  actualPercentGrade?: number | null;
  actualPointsLeftToLose?: number | null;
  sortOrder?: number;
  isDemo?: boolean;
};
type Category = { id: string; name: string; weightPercent?: number; dropLowest?: number };
type Assignment = {
  id: string;
  name: string;
  maxPoints: number;
  dueDate: string | null;
  isExtraCredit: boolean;
  categoryId: string;
  categoryName?: string;
};
type ModalType = "semester" | "course" | "category" | "assignment" | "grade" | null;
type DemoAssignment = { name: string; maxPoints: number; dueDate?: string; isExtraCredit?: boolean; earnedPoints?: number };
type DemoCourse = {
  name: string;
  code: string;
  credits: number;
  desiredLetterGrade: string;
  gradingMethod: "WEIGHTED" | "POINTS";
  categories: { name: string; weightPercent: number; dropLowest?: number }[];
  assignments: (DemoAssignment & { categoryName: string })[];
};

const semesterSeasons = ["Fall", "Spring", "Summer", "Winter"];

const seasonDates = (season: string, yearStr: string) => {
  const year = Number(yearStr) || new Date().getFullYear();
  switch (season) {
    case "Spring":
      return {
        startDate: new Date(`${year}-01-15`).toISOString(),
        endDate: new Date(`${year}-05-15`).toISOString(),
      };
    case "Summer":
      return {
        startDate: new Date(`${year}-05-20`).toISOString(),
        endDate: new Date(`${year}-08-20`).toISOString(),
      };
    case "Winter":
      return {
        startDate: new Date(`${year}-12-15`).toISOString(),
        endDate: new Date(`${year + 1}-01-20`).toISOString(),
      };
    case "Fall":
    default:
      return {
        startDate: new Date(`${year}-08-20`).toISOString(),
        endDate: new Date(`${year}-12-20`).toISOString(),
      };
  }
};

const parseSemesterName = (name: string) => {
  const [maybeSeason, maybeYear] = name.split(" ");
  const season = semesterSeasons.includes(maybeSeason) ? maybeSeason : "Fall";
  const year = /^\d{4}$/.test(maybeYear ?? "") ? maybeYear : String(new Date().getFullYear());
  return { season, year };
};

const LAST_SEMESTER_KEY = "ayg_last_semester_id";

export default function Semester() {
  const { toast } = useToast();
  const nav = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null);
  const [draggingCourseId, setDraggingCourseId] = useState<string | null>(null);
  const lastCourseDropRef = useRef<number>(0);

  const token = useMemo(() => localStorage.getItem("ayg_token"), []);
  const activeSemester = useMemo(
    () => semesters.find((semester) => semester.id === selectedSemesterId) ?? null,
    [semesters, selectedSemesterId],
  );
  const activeCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId),
    [courses, selectedCourseId],
  );
  const sortedCourses = useMemo(() => {
    const list = [...courses];
    list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return list;
  }, [courses]);

  useEffect(() => {
    if (!token) {
      nav("/auth?mode=login");
      return;
    }
    loadSemesters();
  }, [token]);

  useEffect(() => {
    if (selectedSemesterId) loadCourses(selectedSemesterId);
  }, [selectedSemesterId]);

  useEffect(() => {
    if (selectedSemesterId) {
      localStorage.setItem(LAST_SEMESTER_KEY, selectedSemesterId);
    }
  }, [selectedSemesterId]);

  const loadSemesters = async () => {
    try {
      const data = await http<Semester[]>("/semesters");
      setSemesters(data ?? []);
      if (data?.length) {
        const storedId = localStorage.getItem(LAST_SEMESTER_KEY);
        const match = storedId ? data.find((s) => s.id === storedId) : undefined;
        setSelectedSemesterId(match?.id ?? data[0].id);
      }
    } catch (err) {
      toast({
        title: "Failed to load semesters",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const loadCourses = async (semesterId: string) => {
    try {
      const data = await http<Course[]>(`/semesters/${semesterId}/courses`);
      setCourses(data ?? []);
      if (data?.length) {
        setSelectedCourseId(data[0].id);
        await loadCategoriesAndAssignments(data[0].id);
      } else {
        setSelectedCourseId(null);
        setCategories([]);
        setAssignments([]);
      }
    } catch (err) {
      toast({
        title: "Failed to load courses",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleModalSubmit = (type: ModalType, data: unknown) => {
    if (type === "semester") {
      if (editingSemester) updateSemester(editingSemester.id, data as SemesterFormData);
      else createSemester(data as SemesterFormData);
    }
    else if (type === "course") {
      if (editingCourse) updateCourse(editingCourse.id, data as CourseFormData);
      else createCourse(data as CourseFormData);
    }
    else if (type === "category") createCategory(data as CategoryFormData);
    else if (type === "assignment") createAssignment(data as AssignmentFormData);
    else {
      toast({ title: "Coming soon", description: "Grades not wired yet." });
    }
  };

  const createSemester = async (form: SemesterFormData) => {
    setLoading(true);
    try {
      const name = form.name || `${form.season} ${form.year}`;
      const dates = seasonDates(form.season, form.year);
      const payload = {
        name,
        startDate: form.startDate || dates.startDate,
        endDate: form.endDate || dates.endDate,
      };
      const created = await http<Semester>("/semesters", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setSemesters((prev) => [created, ...prev]);
      setSelectedSemesterId(created.id);
      toast({ title: "Semester added", description: created.name });
    } catch (err) {
      toast({
        title: "Failed to add semester",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSemester = async (semesterId: string, form: SemesterFormData) => {
    setLoading(true);
    try {
      const name = form.name || `${form.season} ${form.year}`;
      const dates = seasonDates(form.season, form.year);
      const payload = {
        name,
        startDate: form.startDate || dates.startDate,
        endDate: form.endDate || dates.endDate,
      };
      const updated = await http<Semester>(`/semesters/${semesterId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setSemesters((prev) => prev.map((semester) => (semester.id === semesterId ? updated : semester)));
      toast({ title: "Semester updated", description: updated.name });
    } catch (err) {
      toast({
        title: "Failed to update semester",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createCourse = async (form: CourseFormData) => {
    if (!selectedSemesterId) return;
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        code: form.code,
        credits: form.credits,
        desiredLetterGrade: form.targetGrade,
        gradingMethod: form.gradingMethod,
      };
      const created = await http<Course>(`/semesters/${selectedSemesterId}/courses`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setCourses((prev) => [created, ...prev]);
      toast({ title: "Course added", description: created.name });
    } catch (err) {
      toast({
        title: "Failed to add course",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateCourse = async (courseId: string, form: CourseFormData) => {
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        code: form.code,
        credits: form.credits,
        desiredLetterGrade: form.targetGrade,
        gradingMethod: form.gradingMethod,
      };
      const updated = await http<Course>(`/courses/${courseId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setCourses((prev) => prev.map((c) => (c.id === courseId ? updated : c)));
      toast({ title: "Course updated", description: updated.name });
    } catch (err) {
      toast({
        title: "Failed to update course",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setEditingCourse(null);
    }
  };

  const loadCategoriesAndAssignments = async (courseId: string) => {
    try {
      const cats = await http<Category[]>(`/courses/${courseId}/categories`);
      setCategories(cats ?? []);

      const assignmentsData: Assignment[] = [];
      if (cats?.length) {
        for (const cat of cats) {
          const list = await http<any[]>(`/categories/${cat.id}/assignments`);
          list.forEach((a) =>
            assignmentsData.push({
              id: a.id,
              name: a.name,
              maxPoints: a.maxPoints,
              dueDate: a.dueDate,
              isExtraCredit: a.isExtraCredit,
              categoryId: cat.id,
              categoryName: cat.name,
            })
          );
        }
      }
      setAssignments(assignmentsData);
      return cats ?? [];
    } catch (err) {
      toast({
        title: "Failed to load categories/assignments",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
      return [];
    }
  };

  const createCategory = async (form: CategoryFormData) => {
    if (!selectedCourseId) return;
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        weightPercent: form.weight,
        dropLowest: form.dropLowest ? form.dropCount : 0,
      };
      const created = await http<Category>(`/courses/${selectedCourseId}/categories`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setCategories((prev) => [...prev, created]);
      toast({ title: "Category added", description: created.name });
    } catch (err) {
      toast({
        title: "Failed to add category",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createAssignment = async (form: AssignmentFormData) => {
    if (!form.categoryId) {
      toast({ title: "Select a category first", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        maxPoints: form.max ? Number(form.max) : 0,
        isExtraCredit: form.isExtraCredit,
      };
      const created = await http<Assignment>(`/categories/${form.categoryId}/assignments`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const earned = form.earned ? Number(form.earned) : undefined;
      if (earned !== undefined) {
        await http(`/assignments/${created.id}/grade`, {
          method: "PATCH",
          body: JSON.stringify({
            earnedPoints: earned,
          }),
        });
      }
      setAssignments((prev) => [
        ...prev,
        { ...created, categoryId: form.categoryId, categoryName: categories.find((c) => c.id === form.categoryId)?.name },
      ]);
      toast({ title: "Assignment added", description: created.name });
    } catch (err) {
      toast({
        title: "Failed to add assignment",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const persistCourseOrder = async (ordered: Course[]) => {
    if (!selectedSemesterId) return;
    try {
      await http(`/semesters/${selectedSemesterId}/courses/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ orderedIds: ordered.map((course) => course.id) }),
      });
    } catch (err) {
      toast({
        title: "Failed to save order",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCourseDrop = (targetId: string) => {
    if (!draggingCourseId || draggingCourseId === targetId) {
      setDraggingCourseId(null);
      return;
    }
    const list = [...sortedCourses];
    const fromIndex = list.findIndex((course) => course.id === draggingCourseId);
    const toIndex = list.findIndex((course) => course.id === targetId);
    if (fromIndex === -1 || toIndex === -1) {
      setDraggingCourseId(null);
      return;
    }
    const [item] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, item);
    const ordered = list.map((course, index) => ({ ...course, sortOrder: index + 1 }));
    setCourses(ordered);
    void persistCourseOrder(ordered);
    setDraggingCourseId(null);
    lastCourseDropRef.current = Date.now();
  };

  const runAllSimulations = async () => {
    if (!selectedSemesterId) return;
    setLoading(true);
    try {
      const updated = await http<Course[]>(`/semesters/${selectedSemesterId}/run-simulations`, {
        method: "POST",
      });
      if (updated) setCourses(updated);
      toast({ title: "Simulations complete", description: "Course stats updated." });
    } catch (err) {
      toast({
        title: "Failed to run simulations",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);
  const courseCount = courses.length;
  const semesterName = semesters.find((s) => s.id === selectedSemesterId)?.name ?? "Select semester";

  const signOut = () => {
    localStorage.clear();
    nav("/auth?mode=login");
  };

  const letterToGpa = (letter: string): number | null => {
    const map: Record<string, number> = {
      A: 4.0,
      B: 3.0,
      C: 2.0,
      D: 1.0,
      F: 0,
    };
    return map[letter] ?? null;
  };

  const targetGpa = useMemo(() => {
    const eligible = courses.filter((c) => letterToGpa(c.desiredLetterGrade) !== null);
    const total = eligible.reduce((sum, c) => sum + c.credits, 0);
    if (total === 0) return null;
    const weighted = eligible.reduce(
      (sum, c) => sum + (letterToGpa(c.desiredLetterGrade) ?? 0) * c.credits,
      0,
    );
    return weighted / total;
  }, [courses]);

  const currentGpa = useMemo(() => {
    const graded = courses.filter((c) => c.actualLetterGrade && letterToGpa(c.actualLetterGrade) !== null);
    const total = graded.reduce((sum, c) => sum + c.credits, 0);
    if (total === 0) return null;
    const weighted = graded.reduce(
      (sum, c) => sum + (letterToGpa(c.actualLetterGrade as string) ?? 0) * c.credits,
      0,
    );
    return weighted / total;
  }, [courses]);

  const currentGpaDisplay = currentGpa === null ? "—" : currentGpa.toFixed(2);

  const semesterPercent = useMemo(() => {
    const graded = courses.filter((c) => c.actualPercentGrade !== null && c.actualPercentGrade !== undefined);
    const total = graded.reduce((sum, c) => sum + c.credits, 0);
    if (total === 0) return null;
    const weighted = graded.reduce(
      (sum, c) => sum + (c.actualPercentGrade ?? 0) * c.credits,
      0,
    );
    return weighted / total;
  }, [courses]);

  const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  const sample = <T,>(list: T[]) => list[randInt(0, list.length - 1)];
  const shuffle = <T,>(list: T[]) => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = randInt(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const splitTotal = (total: number, count: number, min = 1) => {
    if (count <= 0) return [];
    const base = Array(count).fill(min);
    let remaining = total - min * count;
    if (remaining < 0) {
      const equal = Math.floor(total / count);
      return Array(count).fill(equal);
    }
    const weights = Array.from({ length: count }, () => Math.random());
    const weightSum = weights.reduce((sum, w) => sum + w, 0) || 1;
    const allocations = weights.map((w) => Math.floor((w / weightSum) * remaining));
    let used = allocations.reduce((sum, v) => sum + v, 0);
    let leftover = remaining - used;
    let idx = 0;
    while (leftover > 0) {
      allocations[idx % count] += 1;
      leftover -= 1;
      idx += 1;
    }
    return base.map((v, i) => v + allocations[i]);
  };
  const pickUnique = (list: string[], count: number) => shuffle(list).slice(0, count);
  const makeCourseCode = (name: string) => {
    const prefix = name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .replace(/[^A-Z]/gi, "")
      .toUpperCase()
      .slice(0, 4);
    return `${prefix}${randInt(100, 499)}`;
  };
  const makeAssignmentName = (categoryName: string, index: number) => {
    const label = categoryName.toLowerCase();
    if (label.includes("quiz")) return `Quiz ${index}`;
    if (label.includes("lab")) return `Lab ${index}`;
    if (label.includes("exam") || label.includes("test")) return index === 1 ? "Midterm" : "Final";
    if (label.includes("project")) return `Project ${index}`;
    if (label.includes("essay") || label.includes("writing")) return `Essay ${index}`;
    if (label.includes("discussion")) return `Discussion ${index}`;
    if (label.includes("homework") || label.includes("problem") || label.includes("practice")) return `HW ${index}`;
    return `Assignment ${index}`;
  };
  const buildDemoCourses = (): DemoCourse[] => {
    const courseSubjects = [
      "Biology",
      "Psychology",
      "Economics",
      "Statistics",
      "Computer Science",
      "Sociology",
      "Chemistry",
      "Philosophy",
      "Marketing",
      "Physics",
      "Literature",
      "Art History",
    ];
    const weightedCategoryPool = [
      "Homework",
      "Quizzes",
      "Labs",
      "Projects",
      "Exams",
      "Essays",
      "Participation",
      "Presentations",
      "Problem Sets",
    ];
    const pointsCategoryPool = [
      "Projects",
      "Quizzes",
      "Labs",
      "Reflections",
      "Case Studies",
      "Practice",
      "Exercises",
      "Workshops",
    ];
    const gradingPlan = shuffle([
      "WEIGHTED",
      "WEIGHTED",
      "WEIGHTED",
      "POINTS",
      "POINTS",
    ] as const);
    const hybridPick = randInt(0, 1);
    let pointsSeen = 0;

    return gradingPlan.map((method) => {
      const subject = sample(courseSubjects);
      const name = `${subject} ${randInt(100, 499)}`;
      const code = makeCourseCode(subject);
      const credits = randInt(2, 5);
      const desiredLetterGrade = "A";
      const totalAssignments = randInt(8, 12);
      const maxPointsList = splitTotal(1000, totalAssignments, 20);
      let maxIndex = 0;

      let categoryNames: string[] = [];
      let categoryWeights: number[] = [];
      if (method === "WEIGHTED") {
        const categoryCount = randInt(3, 5);
        categoryNames = pickUnique(weightedCategoryPool, categoryCount);
        categoryWeights = splitTotal(100, categoryCount, 10);
      } else {
        const useHybrid = pointsSeen === hybridPick;
        pointsSeen += 1;
        if (useHybrid) {
          const extraCount = randInt(1, 3);
          categoryNames = ["All Assignments", ...pickUnique(pointsCategoryPool, extraCount)];
        } else {
          categoryNames = ["All Assignments"];
        }
        categoryWeights = categoryNames.map(() => 0);
      }

      const categoryCounts = splitTotal(totalAssignments, categoryNames.length, 1);
      const categories = categoryNames.map((catName, index) => {
        const count = categoryCounts[index] ?? 1;
        const dropChance = Math.random();
        const dropLowest =
          count >= 4 && dropChance > 0.6 ? randInt(1, Math.min(2, count - 2)) : count >= 3 && dropChance > 0.75 ? 1 : 0;
        return {
          name: catName,
          weightPercent: categoryWeights[index] ?? 0,
          dropLowest,
          count,
        };
      });

      const assignments = categories.flatMap((category) => {
        return Array.from({ length: category.count }, (_, i) => {
          const maxPoints = maxPointsList[maxIndex] ?? 0;
          maxIndex += 1;
          const isExtraCredit = Math.random() < 0.1;
          const isGraded = Math.random() < 0.6;
          const earnedPoints = isGraded
            ? Math.max(1, Math.round(maxPoints * (0.6 + Math.random() * 0.35)))
            : undefined;
          return {
            name: makeAssignmentName(category.name, i + 1),
            maxPoints,
            isExtraCredit,
            earnedPoints,
            categoryName: category.name,
          };
        });
      });

      return {
        name,
        code,
        credits,
        desiredLetterGrade,
        gradingMethod: method,
        categories: categories.map(({ count, ...rest }) => rest),
        assignments,
      };
    });
  };

  const seedDemo = async () => {
    if (!selectedSemesterId) {
      toast({ title: "Select a semester first", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const existing = await http<Course[]>(`/semesters/${selectedSemesterId}/courses`);
      const demoIds = (existing ?? []).filter((c) => c.isDemo).map((c) => c.id);
      for (const id of demoIds) {
        await http(`/courses/${id}`, { method: "DELETE" });
      }

      const demoCourses = buildDemoCourses();
      for (const c of demoCourses) {
        const course = await http<Course>(`/semesters/${selectedSemesterId}/courses`, {
          method: "POST",
          body: JSON.stringify({
            name: c.name,
            code: c.code,
            credits: c.credits,
            desiredLetterGrade: c.desiredLetterGrade,
            gradingMethod: c.gradingMethod,
            isDemo: true,
          }),
        });

        const categoryIdMap = new Map<string, string>();
        if (c.gradingMethod === "POINTS") {
          const existingCategories = await http<Category[]>(`/courses/${course.id}/categories`);
          existingCategories?.forEach((cat) => categoryIdMap.set(cat.name, cat.id));
        }

        for (const cat of c.categories) {
          if (c.gradingMethod === "POINTS" && cat.name === "All Assignments") continue;
          const category = await http<Category>(`/courses/${course.id}/categories`, {
            method: "POST",
            body: JSON.stringify({
              name: cat.name,
              weightPercent: cat.weightPercent,
              dropLowest: cat.dropLowest ?? 0,
            }),
          });
          categoryIdMap.set(category.name, category.id);
        }

        if (c.gradingMethod === "POINTS" && !categoryIdMap.has("All Assignments")) {
          const existingCategories = await http<Category[]>(`/courses/${course.id}/categories`);
          const allAssignments = existingCategories?.find((cat) => cat.name === "All Assignments");
          if (allAssignments) categoryIdMap.set(allAssignments.name, allAssignments.id);
        }

        for (const assignmentSpec of c.assignments) {
          const categoryId =
            categoryIdMap.get(assignmentSpec.categoryName) ?? categoryIdMap.get("All Assignments");
          if (!categoryId) continue;
          const assignment = await http<Assignment>(`/categories/${categoryId}/assignments`, {
            method: "POST",
            body: JSON.stringify({
              name: assignmentSpec.name,
              maxPoints: assignmentSpec.maxPoints,
              dueDate: assignmentSpec.dueDate ? new Date(assignmentSpec.dueDate).toISOString() : null,
              isExtraCredit: assignmentSpec.isExtraCredit ?? false,
            }),
          });
          if (assignmentSpec.earnedPoints !== undefined) {
            await http(`/assignments/${assignment.id}/grade`, {
              method: "PUT",
              body: JSON.stringify({
                earnedPoints: assignmentSpec.earnedPoints,
                expectedPoints: assignmentSpec.earnedPoints,
              }),
            });
          }
        }
      }
      await loadCourses(selectedSemesterId);
      toast({ title: "Demo data loaded", description: "Added courses, categories, and assignments." });
    } catch (err) {
      toast({
        title: "Failed to load demo data",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold text-foreground hidden sm:block">AYG</span>
              </Link>
              
              {/* Semester Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="hidden sm:inline">{semesterName}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Select Semester</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {semesters.map((sem) => (
                    <DropdownMenuItem key={sem.id} onClick={() => setSelectedSemesterId(sem.id)}>
                      {sem.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setActiveModal("semester")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Semester
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-3">
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
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <button className="flex items-center w-full" onClick={signOut}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign out
                    </button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/50 bg-background p-4 space-y-2">
            <Button variant="ghost" className="w-full justify-start gap-2">
              <User className="h-4 w-4" />
              Profile
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Stats */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard
                title="GPA"
                value={currentGpaDisplay}
                icon={TrendingUp}
                subtitle={targetGpa === null ? "Target GPA —" : `Target GPA ${targetGpa.toFixed(2)}`}
                trend={{ value: 0, isPositive: true }}
              />
              <StatCard
                title="Credits"
                value={String(totalCredits)}
                icon={GraduationCap}
                subtitle="Total credit load"
                trend={{ value: 0, isPositive: true }}
              />
              <StatCard
                title="Courses"
                value={String(courseCount)}
                icon={BookOpen}
                subtitle="Active this semester"
                trend={{ value: 0, isPositive: true }}
              />
            </div>

            {/* Courses */}
            <div className="grid md:grid-cols-2 gap-4">
              {sortedCourses.map((course) => (
                <div
                  key={course.id}
                  className={draggingCourseId === course.id ? "opacity-75" : ""}
                  draggable
                  onDragStart={() => setDraggingCourseId(course.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleCourseDrop(course.id)}
                  onDragEnd={() => {
                    setDraggingCourseId(null);
                    lastCourseDropRef.current = Date.now();
                  }}
                  onClick={() => {
                    if (draggingCourseId) return;
                    if (Date.now() - lastCourseDropRef.current < 200) return;
                    setSelectedCourseId(course.id);
                    nav(`/courses/${course.id}`);
                  }}
                >
                  <CourseCard
                    name={course.name}
                    code={course.code ?? ""}
                    credits={course.credits}
                    gradingMethod={course.gradingMethod}
                    isDemo={course.isDemo}
                    currentGrade={course.actualPercentGrade ?? null}
                    letterGrade={course.actualLetterGrade ?? "—"}
                    targetLetter={course.desiredLetterGrade}
                    trend="stable"
                    pointsLeftToLose={course.actualPointsLeftToLose ?? null}
                    menuItems={[
                      {
                        label: "Add assignment",
                        icon: <Calendar className="h-4 w-4" />,
                        onClick: async () => {
                          setSelectedCourseId(course.id);
                          const courseCategories = await loadCategoriesAndAssignments(course.id);
                          if (course.gradingMethod !== "POINTS" && courseCategories.length === 0) {
                            toast({ title: "Add a category first", variant: "destructive" });
                            setActiveModal("category");
                            return;
                          }
                          setActiveModal("assignment");
                        },
                        disabled:
                          !course.id ||
                          (course.gradingMethod !== "POINTS" &&
                            course.id === selectedCourseId &&
                            categories.length === 0),
                      },
                      {
                        label: "Add category",
                        icon: <Target className="h-4 w-4" />,
                        onClick: async () => {
                          setSelectedCourseId(course.id);
                          await loadCategoriesAndAssignments(course.id);
                          setActiveModal("category");
                        },
                        disabled: !course.id,
                      },
                      {
                        label: "Edit course",
                        icon: <Settings className="h-4 w-4" />,
                        onClick: () => {
                          setEditingCourse(course);
                          setActiveModal("course");
                        },
                        disabled: !course.id,
                      },
                    ]}
                  />
                </div>
              ))}
              {courses.length === 0 && (
                <Card className="bg-muted/30 border-dashed">
                  <CardHeader>
                    <CardTitle className="text-muted-foreground text-sm">No courses yet</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" onClick={() => setActiveModal("course")}>
                      Add your first course
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-4">
                <ProgressRing progress={semesterPercent ?? 0} size={90} color="primary" />
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Semester average</p>
                  <p className="text-2xl font-bold text-foreground">
                    {semesterPercent === null ? "—" : `${Math.round(semesterPercent)}%`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {semesterPercent === null
                      ? "Add grades to see your overall progress."
                      : "Weighted by course credits."}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Quick actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    setEditingSemester(null);
                    setActiveModal("semester");
                  }}
                >
                  <Calendar className="h-4 w-4 text-primary" />
                  Add Semester
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    if (!activeSemester) return;
                    setEditingSemester(activeSemester);
                    setActiveModal("semester");
                  }}
                  disabled={!activeSemester}
                >
                  <Calendar className="h-4 w-4 text-primary" />
                  Edit Semester
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => setActiveModal("course")}
                  disabled={!selectedSemesterId}
                >
                  <Plus className="h-4 w-4 text-primary" />
                  Add Course
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={runAllSimulations}
                  disabled={!courses.length || loading}
                >
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Run all course simulations
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() =>
                    toast({
                      title: "Coming soon",
                      description: "Syllabus import is on the way.",
                    })
                  }
                >
                  <BookOpen className="h-4 w-4 text-primary" />
                  Import syllabus
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={seedDemo}
                  disabled={!selectedSemesterId || loading}
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                  Load demo data
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {categories.length === 0 && <p className="text-sm text-muted-foreground">Add categories to see insights.</p>}
                {categories.length > 0 && assignments.length === 0 && (
                  <p className="text-sm text-muted-foreground">Add assignments to see insights.</p>
                )}
                {assignments.length > 0 && (
                  <div className="p-3 rounded-lg bg-background border border-border/50">
                    <p className="text-sm font-medium text-foreground">Tracking in progress</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {assignments.length} assignments across {categories.length} categories.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Modals */}
      <SemesterModal
        open={activeModal === "semester"}
        onOpenChange={(open) => {
          if (!open) {
            setActiveModal(null);
            setEditingSemester(null);
          }
        }}
        onSubmit={(data: SemesterFormData) => handleModalSubmit("semester", data)}
        initialData={
          editingSemester
            ? {
                name: editingSemester.name,
                ...parseSemesterName(editingSemester.name),
                startDate: editingSemester.startDate,
                endDate: editingSemester.endDate,
              }
            : undefined
        }
      />
      <CourseModal
        open={activeModal === "course"}
        onOpenChange={(open) => {
          if (!open) {
            setActiveModal(null);
            setEditingCourse(null);
          }
        }}
        onSubmit={(data: CourseFormData) => handleModalSubmit("course", data)}
        initialData={
          editingCourse
            ? {
                name: editingCourse.name,
                code: editingCourse.code ?? "",
                credits: editingCourse.credits,
                targetGrade: editingCourse.desiredLetterGrade,
                gradingMethod: editingCourse.gradingMethod ?? "WEIGHTED",
              }
            : undefined
        }
      />
      <CategoryModal
        open={activeModal === "category"}
        onOpenChange={(open) => !open && setActiveModal(null)}
        onSubmit={(data: CategoryFormData) => handleModalSubmit("category", data)}
        gradingMethod={activeCourse?.gradingMethod ?? "WEIGHTED"}
      />
      <AssignmentModal
        open={activeModal === "assignment"}
        onOpenChange={(open) => !open && setActiveModal(null)}
        onSubmit={(data: AssignmentFormData) => handleModalSubmit("assignment", data)}
        categories={categories}
        assignments={assignments}
      />
      <GradeModal
        open={activeModal === "grade"}
        onOpenChange={(open) => !open && setActiveModal(null)}
        onSubmit={(data: GradeFormData) => handleModalSubmit("grade", data)}
      />
    </div>
  );
}
