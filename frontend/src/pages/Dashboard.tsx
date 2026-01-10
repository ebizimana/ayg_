import { useEffect, useMemo, useState } from "react";
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
type Course = { id: string; name: string; code?: string; credits: number; desiredLetterGrade: string; gradingMethod?: "WEIGHTED" | "POINTS" };
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
type DemoCategory = { name: string; weightPercent: number; dropLowest?: number; assignments: DemoAssignment[] };
type DemoCourse = { name: string; credits: number; desiredLetterGrade: string; gradingMethod?: "WEIGHTED" | "POINTS"; categories: DemoCategory[] };

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

export default function Dashboard() {
  const { toast } = useToast();
  const nav = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);

  const token = useMemo(() => localStorage.getItem("ayg_token"), []);
  const activeCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId),
    [courses, selectedCourseId],
  );

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

  const loadSemesters = async () => {
    try {
      const data = await http<Semester[]>("/semesters");
      setSemesters(data ?? []);
      if (data?.length) setSelectedSemesterId(data[0].id);
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
    if (type === "semester") createSemester(data as SemesterFormData);
    else if (type === "course") createCourse(data as CourseFormData);
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

  const loadCategoriesAndAssignments = async (courseId: string) => {
    try {
      const cats = await http<Category[]>(`/courses/${courseId}/categories`);
      setCategories(cats ?? []);
      setSelectedCategoryId(cats?.[0]?.id ?? null);

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
    } catch (err) {
      toast({
        title: "Failed to load categories/assignments",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
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
      setSelectedCategoryId(created.id);
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
    if (!selectedCategoryId) {
      toast({ title: "Select a category first", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        maxPoints: form.pointsPossible,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        isExtraCredit: form.isExtraCredit,
      };
      const created = await http<Assignment>(`/categories/${selectedCategoryId}/assignments`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setAssignments((prev) => [
        ...prev,
        { ...created, categoryId: selectedCategoryId, categoryName: categories.find((c) => c.id === selectedCategoryId)?.name },
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

  const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);
  const courseCount = courses.length;
  const semesterName = semesters.find((s) => s.id === selectedSemesterId)?.name ?? "Select semester";

  const signOut = () => {
    localStorage.clear();
    nav("/auth?mode=login");
  };

  const letterToTarget = (letter: string) => {
    const map: Record<string, number> = { A: 90, "A-": 90, "B+": 85, B: 80, "B-": 78, "C+": 75, C: 70, "C-": 68, D: 60 };
    return map[letter] ?? 80;
  };

  const demoCourses: DemoCourse[] = [
    {
      name: "Data Structures",
      credits: 4,
      desiredLetterGrade: "A",
      categories: [
        {
          name: "Homeworks",
          weightPercent: 30,
          assignments: [
            { name: "HW1", maxPoints: 100, earnedPoints: 92 },
            { name: "HW2", maxPoints: 100 },
          ],
        },
        {
          name: "Quizzes",
          weightPercent: 20,
          assignments: [
            { name: "Quiz 1", maxPoints: 20, earnedPoints: 18 },
            { name: "Quiz 2", maxPoints: 20 },
          ],
        },
        {
          name: "Exams",
          weightPercent: 50,
          assignments: [
            { name: "Midterm", maxPoints: 100, earnedPoints: 85 },
            { name: "Final", maxPoints: 100 },
          ],
        },
      ],
    },
    {
      name: "Calculus II",
      credits: 4,
      desiredLetterGrade: "A-",
      categories: [
        { name: "Homework", weightPercent: 35, assignments: [{ name: "Set 1", maxPoints: 50, earnedPoints: 45 }] },
        { name: "Quizzes", weightPercent: 15, assignments: [{ name: "Quiz 1", maxPoints: 15 }] },
        { name: "Exams", weightPercent: 50, assignments: [{ name: "Midterm", maxPoints: 100 }] },
      ],
    },
    {
      name: "Tech Writing",
      credits: 3,
      desiredLetterGrade: "B+",
      categories: [
        { name: "Essays", weightPercent: 60, assignments: [{ name: "Essay 1", maxPoints: 100, earnedPoints: 80 }] },
        { name: "Participation", weightPercent: 20, assignments: [{ name: "Participation", maxPoints: 20, earnedPoints: 18 }] },
        { name: "Final", weightPercent: 20, assignments: [{ name: "Final Paper", maxPoints: 100 }] },
      ],
    },
    {
      name: "Physics II",
      credits: 4,
      desiredLetterGrade: "B",
      categories: [
        { name: "Labs", weightPercent: 25, assignments: [{ name: "Lab 1", maxPoints: 30, earnedPoints: 25 }] },
        { name: "Quizzes", weightPercent: 25, assignments: [{ name: "Quiz 1", maxPoints: 20 }] },
        { name: "Exams", weightPercent: 50, assignments: [{ name: "Midterm", maxPoints: 100 }] },
      ],
    },
    {
      name: "History",
      credits: 3,
      desiredLetterGrade: "B+",
      categories: [
        { name: "Essays", weightPercent: 50, assignments: [{ name: "Essay 1", maxPoints: 100, earnedPoints: 88 }] },
        { name: "Participation", weightPercent: 10, assignments: [{ name: "Participation", maxPoints: 20 }] },
        { name: "Exams", weightPercent: 40, assignments: [{ name: "Midterm", maxPoints: 100 }] },
      ],
    },
  ];

  const seedDemo = async () => {
    if (!selectedSemesterId) {
      toast({ title: "Select a semester first", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      for (const c of demoCourses) {
        const course = await http<Course>(`/semesters/${selectedSemesterId}/courses`, {
          method: "POST",
          body: JSON.stringify({
            name: c.name,
            credits: c.credits,
            desiredLetterGrade: c.desiredLetterGrade,
          }),
        });
        for (const cat of c.categories) {
          const category = await http<Category>(`/courses/${course.id}/categories`, {
            method: "POST",
            body: JSON.stringify({
              name: cat.name,
              weightPercent: cat.weightPercent,
              dropLowest: cat.dropLowest ?? 0,
            }),
          });
          for (const a of cat.assignments) {
            const assignment = await http<Assignment>(`/categories/${category.id}/assignments`, {
              method: "POST",
              body: JSON.stringify({
                name: a.name,
                maxPoints: a.maxPoints,
                dueDate: a.dueDate ? new Date(a.dueDate).toISOString() : null,
                isExtraCredit: a.isExtraCredit ?? false,
              }),
            });
            if (a.earnedPoints !== undefined) {
              await http(`/assignments/${assignment.id}/grade`, {
                method: "PUT",
                body: JSON.stringify({
                  earnedPoints: a.earnedPoints,
                  expectedPoints: a.earnedPoints,
                }),
              });
            }
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
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Courses"
                value={String(courseCount)}
                icon={BookOpen}
                subtitle="Active this semester"
                trend={{ value: 0, isPositive: true }}
              />
              <StatCard
                title="Credits"
                value={String(totalCredits)}
                icon={GraduationCap}
                subtitle="Total credit load"
                trend={{ value: 0, isPositive: true }}
              />
            </div>

            {/* Courses */}
            <div className="grid md:grid-cols-2 gap-4">
              {courses.map((course) => (
        <div
          key={course.id}
          onClick={() => {
            setSelectedCourseId(course.id);
            nav(`/courses/${course.id}`);
          }}
        >
          <CourseCard
            name={course.name}
            code={course.code ?? ""}
            currentGrade={0}
            targetGrade={letterToTarget(course.desiredLetterGrade)}
            letterGrade={course.desiredLetterGrade}
            trend="stable"
            credits={course.credits}
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
                <ProgressRing progress={courses.length ? 75 : 0} size={90} color="primary" />
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Courses this semester</p>
                  <p className="text-2xl font-bold text-foreground">{courses.length}</p>
                  <p className="text-xs text-muted-foreground">
                    Add courses to start tracking your grades.
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
                <p className="text-xs text-muted-foreground">
                  {selectedCourseId
                    ? `For course: ${courses.find((c) => c.id === selectedCourseId)?.name ?? "Select a course"}`
                    : "Select a course to add categories or assignments"}
                </p>
                {categories.length > 0 && (
                  <div className="flex items-center gap-2 pt-2">
                    <span className="text-xs text-muted-foreground">Category:</span>
                    <select
                      className="text-sm border rounded-md px-2 py-1 bg-background"
                      value={selectedCategoryId ?? ""}
                      onChange={(e) => setSelectedCategoryId(e.target.value)}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
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
                  onClick={seedDemo}
                  disabled={!selectedSemesterId || loading}
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                  Load demo data
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => setActiveModal("assignment")}
                  disabled={!selectedCourseId || categories.length === 0 || !selectedCategoryId}
                >
                  <Calendar className="h-4 w-4 text-primary" />
                  Add Assignment
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => setActiveModal("category")}
                  disabled={!selectedCourseId}
                >
                  <Target className="h-4 w-4 text-primary" />
                  Add Category
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
        onOpenChange={(open) => !open && setActiveModal(null)}
        onSubmit={(data: SemesterFormData) => handleModalSubmit("semester", data)}
      />
      <CourseModal
        open={activeModal === "course"}
        onOpenChange={(open) => !open && setActiveModal(null)}
        onSubmit={(data: CourseFormData) => handleModalSubmit("course", data)}
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
      />
      <GradeModal
        open={activeModal === "grade"}
        onOpenChange={(open) => !open && setActiveModal(null)}
        onSubmit={(data: GradeFormData) => handleModalSubmit("grade", data)}
      />
    </div>
  );
}
