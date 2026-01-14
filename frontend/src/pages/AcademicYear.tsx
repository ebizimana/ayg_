import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SemesterModal, TargetGpaModal, type SemesterFormData } from "@/components/modals";
import { useToast } from "@/hooks/use-toast";
import { http } from "@/lib/http";
import { GraduationCap, Plus, Bell, User, Settings, LogOut, ChevronDown, Menu, X, MoreVertical } from "lucide-react";

type Semester = { id: string; name: string; startDate: string; endDate: string };
type Course = {
  id: string;
  name: string;
  code?: string;
  credits: number;
  desiredLetterGrade: string;
  actualLetterGrade?: string | null;
};
type TargetGpaSession = {
  id: string;
  scope: "CAREER" | "YEAR" | "SEMESTER";
  targetGpa: number;
  yearIndex?: number | null;
  semesterId?: string | null;
  maxAchievableGpa?: number | null;
  gpaShortfall?: number | null;
};
type ModalType = "semester" | null;

const semesterSeasons = ["Fall", "Spring", "Summer", "Winter"];
const defaultYearLabels = ["Freshman", "Sophomore", "Junior", "Senior"];
const YEAR_LABELS_KEY = "ayg_year_labels";
const LAST_SEMESTER_KEY = "ayg_last_semester_id";

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

const gradePoints: Record<string, number> = {
  "A+": 4.0,
  A: 4.0,
  "A-": 3.7,
  "B+": 3.3,
  B: 3.0,
  "B-": 2.7,
  "C+": 2.3,
  C: 2.0,
  "C-": 1.7,
  "D+": 1.3,
  D: 1.0,
  F: 0,
};

const calculateTargetGpa = (courses: Course[]) => {
  const totals = courses.reduce(
    (acc, course) => {
      const credits = Number(course.credits) || 0;
      const points = gradePoints[course.desiredLetterGrade?.toUpperCase?.() ?? ""] ?? 0;
      acc.totalCredits += credits;
      acc.totalPoints += points * credits;
      return acc;
    },
    { totalCredits: 0, totalPoints: 0 },
  );
  const gpa = totals.totalCredits ? totals.totalPoints / totals.totalCredits : 0;
  return { totalCredits: totals.totalCredits, gpa };
};

const calculateGpa = (courses: Course[], gradeAccessor: (course: Course) => string | null | undefined) => {
  const totals = courses.reduce(
    (acc, course) => {
      const credits = Number(course.credits) || 0;
      const grade = gradeAccessor(course);
      const points = gradePoints[grade?.toUpperCase?.() ?? ""] ?? null;
      if (points === null) return acc;
      acc.totalCredits += credits;
      acc.totalPoints += points * credits;
      return acc;
    },
    { totalCredits: 0, totalPoints: 0 },
  );
  if (!totals.totalCredits) return null;
  return totals.totalPoints / totals.totalCredits;
};

export default function AcademicYear() {
  const { toast } = useToast();
  const nav = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [coursesBySemester, setCoursesBySemester] = useState<Record<string, Course[]>>({});
  const [loading, setLoading] = useState(false);
  const [fieldOfStudy, setFieldOfStudy] = useState(localStorage.getItem("ayg_field_of_study") ?? "");
  const [targetGpaSession, setTargetGpaSession] = useState<TargetGpaSession | null>(null);
  const [careerTargetModalOpen, setCareerTargetModalOpen] = useState(false);
  const [yearTargetIndex, setYearTargetIndex] = useState<number | null>(null);
  const [yearTargetLabel, setYearTargetLabel] = useState<string>("Year");
  const [yearLabels, setYearLabels] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(YEAR_LABELS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.every((value) => typeof value === "string")) {
          if (parsed.length === defaultYearLabels.length) return parsed;
        }
      }
    } catch {
      // Ignore parsing failures and use defaults.
    }
    return defaultYearLabels;
  });
  const [yearEditIndex, setYearEditIndex] = useState<number | null>(null);
  const [yearEditName, setYearEditName] = useState("");
  const [yearDeleteIndex, setYearDeleteIndex] = useState<number | null>(null);

  const token = useMemo(() => localStorage.getItem("ayg_token"), []);

  useEffect(() => {
    if (!token) {
      nav("/auth?mode=login");
      return;
    }
    loadSemesters();
    loadTargetGpaSession();
  }, [token]);

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
      setCoursesBySemester((prev) => ({ ...prev, [created.id]: [] }));
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

  const deleteSemester = async (semesterId: string) => {
    setLoading(true);
    try {
      await http(`/semesters/${semesterId}`, { method: "DELETE" });
      setSemesters((prev) => prev.filter((semester) => semester.id !== semesterId));
      setCoursesBySemester((prev) => {
        const next = { ...prev };
        delete next[semesterId];
        return next;
      });
      toast({ title: "Semester deleted" });
    } catch (err) {
      toast({
        title: "Failed to delete semester",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleCareerTargetSave = async (enabled: boolean, value?: number) => {
    setLoading(true);
    try {
      if (enabled && value !== undefined) {
        await http("/target-gpa/enable", {
          method: "POST",
          body: JSON.stringify({ scope: "CAREER", targetGpa: value }),
        });
      } else {
        await http("/target-gpa/disable", {
          method: "POST",
          body: JSON.stringify({ scope: "CAREER" }),
        });
      }
      await loadTargetGpaSession();
      await loadSemesters();
    } catch (err) {
      toast({
        title: "Failed to update target GPA",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleYearTargetSave = async (enabled: boolean, value?: number) => {
    if (yearTargetIndex === null) return;
    setLoading(true);
    try {
      if (enabled && value !== undefined) {
        await http("/target-gpa/enable", {
          method: "POST",
          body: JSON.stringify({ scope: "YEAR", targetGpa: value, yearIndex: yearTargetIndex }),
        });
      } else {
        await http("/target-gpa/disable", {
          method: "POST",
          body: JSON.stringify({ scope: "YEAR", yearIndex: yearTargetIndex }),
        });
      }
      await loadTargetGpaSession();
      await loadSemesters();
    } catch (err) {
      toast({
        title: "Failed to update year target GPA",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSemesterTargetSave = async (enabled: boolean, value?: number) => {
    if (!editingSemester) return;
    setLoading(true);
    try {
      if (enabled && value !== undefined) {
        await http("/target-gpa/enable", {
          method: "POST",
          body: JSON.stringify({
            scope: "SEMESTER",
            targetGpa: value,
            semesterId: editingSemester.id,
          }),
        });
      } else {
        await http("/target-gpa/disable", {
          method: "POST",
          body: JSON.stringify({ scope: "SEMESTER", semesterId: editingSemester.id }),
        });
      }
      await loadTargetGpaSession();
      await loadSemesters();
    } catch (err) {
      toast({
        title: "Failed to update semester target GPA",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCoursesForSemesters = async (list: Semester[]) => {
    if (!list.length) return;
    try {
      const results = await Promise.allSettled(
        list.map(async (semester) => {
          const courses = await http<Course[]>(`/semesters/${semester.id}/courses`);
          return { semesterId: semester.id, courses: courses ?? [] };
        }),
      );
      const next: Record<string, Course[]> = {};
      let hadError = false;
      results.forEach((result) => {
        if (result.status === "fulfilled") {
          next[result.value.semesterId] = result.value.courses;
        } else {
          hadError = true;
        }
      });
      setCoursesBySemester(next);
      if (hadError) {
        toast({
          title: "Some courses failed to load",
          description: "Refresh to retry loading courses for all semesters.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Failed to load courses",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const loadSemesters = async () => {
    try {
      const data = await http<Semester[]>("/semesters");
      setSemesters(data ?? []);
      if (data?.length) {
        loadCoursesForSemesters(data);
      } else {
        setCoursesBySemester({});
      }
    } catch (err) {
      toast({
        title: "Failed to load semesters",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const loadTargetGpaSession = async () => {
    try {
      const session = await http<TargetGpaSession | null>("/target-gpa/active");
      setTargetGpaSession(session ?? null);
    } catch (err) {
      toast({
        title: "Failed to load target GPA",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const groupedSemesters = useMemo(() => {
    const sorted = [...semesters].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );
    const groups: Semester[][] = [];
    let current: Semester[] = [];
    sorted.forEach((semester) => {
      const { season } = parseSemesterName(semester.name);
      if (season === "Fall" && current.length > 0) {
        groups.push(current);
        current = [];
      }
      current.push(semester);
    });
    if (current.length) groups.push(current);
    if (groups.length > yearLabels.length) {
      const overflow = groups.slice(yearLabels.length - 1).flat();
      return [...groups.slice(0, yearLabels.length - 1), overflow];
    }
    return groups;
  }, [semesters, yearLabels]);

  const yearCards = yearLabels.map((label, index) => ({
    label,
    semesters: groupedSemesters[index] ?? [],
  }));
  const freshmanYear = yearCards[0] ?? { label: "Freshman", semesters: [] as Semester[] };
  const activeYearTarget =
    yearTargetIndex !== null &&
    targetGpaSession?.scope === "YEAR" &&
    targetGpaSession.yearIndex === yearTargetIndex;
  const yearTargetLocked =
    yearTargetIndex !== null && !!targetGpaSession && !activeYearTarget;
  const semesterTargetActive =
    targetGpaSession?.scope === "SEMESTER" && targetGpaSession.semesterId === editingSemester?.id;
  const semesterTargetLocked =
    !!targetGpaSession && !semesterTargetActive && !!editingSemester;
  const allCourses = useMemo(
    () => Object.values(coursesBySemester).flat(),
    [coursesBySemester],
  );
  const currentGpa = useMemo(
    () => calculateGpa(allCourses, (course) => course.actualLetterGrade),
    [allCourses],
  );
  const targetGpa = useMemo(
    () => calculateGpa(allCourses.filter((course) => course.desiredLetterGrade), (course) => course.desiredLetterGrade),
    [allCourses],
  );
  const currentGpaDisplay = currentGpa === null ? "—" : currentGpa.toFixed(2);
  const computedTargetGpaDisplay = targetGpa === null ? "—" : targetGpa.toFixed(2);
  const careerTargetActive = targetGpaSession?.scope === "CAREER";
  const careerTargetLocked = !!targetGpaSession && targetGpaSession.scope !== "CAREER";
  const targetGpaLockedMessage = targetGpaSession
    ? targetGpaSession.scope === "CAREER"
      ? "Career Target GPA is already active."
      : targetGpaSession.scope === "YEAR"
        ? "Year Target GPA is already active."
        : "Semester Target GPA is already active."
    : "";
  const targetGpaDisplay = careerTargetActive
    ? targetGpaSession?.targetGpa.toFixed(2) ?? "—"
    : computedTargetGpaDisplay;
  const targetGpaNote = careerTargetActive ? "Target GPA set. Configure to change." : null;
  const targetGpaShortfall = careerTargetActive ? targetGpaSession?.gpaShortfall ?? null : null;
  const targetGpaMax = careerTargetActive ? targetGpaSession?.maxAchievableGpa ?? null : null;
  const yearTargetLabelDisplay =
    targetGpaSession?.scope === "YEAR"
      ? yearLabels[targetGpaSession.yearIndex ?? 0] ?? "Year"
      : null;
  const yearTargetShortfall =
    targetGpaSession?.scope === "YEAR" ? targetGpaSession?.gpaShortfall ?? null : null;
  const yearTargetMax =
    targetGpaSession?.scope === "YEAR" ? targetGpaSession?.maxAchievableGpa ?? null : null;

  const handleSemesterClick = (semesterId: string) => {
    localStorage.setItem(LAST_SEMESTER_KEY, semesterId);
    nav("/dashboard");
  };

  const signOut = () => {
    localStorage.clear();
    nav("/auth?mode=login");
  };

  const openYearEdit = (index: number) => {
    setYearEditIndex(index);
    setYearEditName(yearLabels[index] ?? "");
  };

  const handleSaveYearLabel = () => {
    if (yearEditIndex === null) return;
    const nextName = yearEditName.trim();
    if (!nextName) {
      toast({
        title: "Year name is required",
        description: "Enter a name before saving.",
        variant: "destructive",
      });
      return;
    }
    setYearLabels((prev) => {
      const next = [...prev];
      next[yearEditIndex] = nextName;
      localStorage.setItem(YEAR_LABELS_KEY, JSON.stringify(next));
      return next;
    });
    setYearEditIndex(null);
    toast({ title: "Year updated", description: `Renamed to ${nextName}.` });
  };

  const handleDeleteYear = async () => {
    if (yearDeleteIndex === null) return;
    const year = yearCards[yearDeleteIndex];
    if (!year) return;
    if (!year.semesters.length) {
      setYearDeleteIndex(null);
      return;
    }
    setLoading(true);
    try {
      if (targetGpaSession?.scope === "YEAR" && targetGpaSession.yearIndex === yearDeleteIndex) {
        await http("/target-gpa/disable", {
          method: "POST",
          body: JSON.stringify({ scope: "YEAR", yearIndex: yearDeleteIndex }),
        });
      }
      await Promise.all(
        year.semesters.map((semester) => http(`/semesters/${semester.id}`, { method: "DELETE" })),
      );
      setYearDeleteIndex(null);
      setYearEditIndex(null);
      await loadSemesters();
      await loadTargetGpaSession();
      toast({
        title: "Year deleted",
        description: "All semesters in this year were removed.",
      });
    } catch (err) {
      toast({
        title: "Failed to delete year",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50">
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
            <span className="font-semibold text-slate-700">Academic Year</span>
          </div>
          <div className="hidden md:flex items-center gap-2">
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
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white/95 px-4 py-3 space-y-2">
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Current GPA</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Overall GPA across all courses.
              </p>
              <div className="mt-3 text-3xl font-bold text-foreground">
                {currentGpaDisplay}
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Target GPA</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setCareerTargetModalOpen(true)}
                    disabled={careerTargetLocked}
                  >
                    Configure
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                GPA if all target grades are met.
              </p>
              <div className="mt-3 text-3xl font-bold text-foreground">
                {targetGpaDisplay}
              </div>
              {targetGpaNote ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {targetGpaNote}
                </p>
              ) : null}
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Field of study</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Edit</DropdownMenuItem>
                  <DropdownMenuItem>Add major/minor</DropdownMenuItem>
                  <DropdownMenuItem>Configure</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <Label htmlFor="field-of-study" className="text-xs text-muted-foreground">
                Add your major or program of study.
              </Label>
              <Input
                id="field-of-study"
                placeholder="Computer Science"
                value={fieldOfStudy}
                onChange={(e) => {
                  setFieldOfStudy(e.target.value);
                  localStorage.setItem("ayg_field_of_study", e.target.value);
                }}
                className="mt-2"
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {yearCards.map((year, index) => (
            <Card key={`${year.label}-${index}`} className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="link"
                      className="h-auto p-0 text-lg font-semibold underline underline-offset-4"
                      onClick={() => {
                        setYearTargetIndex(index);
                        setYearTargetLabel(year.label);
                      }}
                    >
                      {year.label}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem
                          onSelect={(event) => {
                            event.preventDefault();
                            openYearEdit(index);
                          }}
                        >
                          Edit year
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={(event) => {
                            event.preventDefault();
                            setYearDeleteIndex(index);
                          }}
                        >
                          Delete year
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Button
                    size="sm"
                    className="justify-center md:w-auto bg-[#265D80] text-white hover:bg-[#1f4d6a]"
                    onClick={() => setActiveModal("semester")}
                    disabled={loading}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add a semester
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {year.semesters.length === 0 && (
                  <p className="text-sm text-muted-foreground">No semesters added yet.</p>
                )}
                {year.semesters.length > 0 && (
                  <TooltipProvider>
                    <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {year.semesters.map((semester) => {
                        const courses = coursesBySemester[semester.id] ?? [];
                        const totals = calculateTargetGpa(courses);
                        const totalCredits = courses.reduce((sum, course) => sum + (Number(course.credits) || 0), 0);
                        const currentSemesterGpa = calculateGpa(courses, (course) => course.actualLetterGrade);
                        const targetSemesterGpa = calculateGpa(
                          courses.filter((course) => course.desiredLetterGrade),
                          (course) => course.desiredLetterGrade,
                        );
                        const currentSemesterGpaDisplay = currentSemesterGpa === null ? "—" : currentSemesterGpa.toFixed(2);
                        const targetSemesterGpaDisplay = targetSemesterGpa === null ? "—" : targetSemesterGpa.toFixed(2);
                        return (
                          <Card key={semester.id} className="border-slate-200 shadow-sm">
                            <CardContent className="p-0 overflow-hidden">
                              <div className="border-b border-slate-200 bg-slate-50 px-2 py-2">
                                <div className="flex items-center justify-between gap-2">
                                  <Button
                                    variant="link"
                                    className="h-auto p-0 text-sm font-semibold text-slate-800 underline underline-offset-4 hover:text-primary"
                                    onClick={() => handleSemesterClick(semester.id)}
                                  >
                                    {semester.name}
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={(event) => event.stopPropagation()}
                                      >
                                        <Settings className="h-4 w-4 text-slate-500" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onSelect={(event) => {
                                          event.preventDefault();
                                          event.stopPropagation();
                                          setEditingSemester(semester);
                                          setActiveModal("semester");
                                        }}
                                      >
                                        Edit semester
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onSelect={(event) => {
                                          event.preventDefault();
                                          event.stopPropagation();
                                        }}
                                      >
                                        Configure semester
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                              <div className="grid min-w-0 grid-cols-[1fr,60px,80px,80px] gap-2 px-4 py-2 text-xs font-semibold uppercase text-slate-500">
                                <span>Course</span>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-right cursor-default">CR</span>
                                  </TooltipTrigger>
                                  <TooltipContent>Credits</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-right cursor-default">CG</span>
                                  </TooltipTrigger>
                                  <TooltipContent>Current grade</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-right cursor-default">TG</span>
                                  </TooltipTrigger>
                                  <TooltipContent>Target grade</TooltipContent>
                                </Tooltip>
                              </div>
                              <div className="divide-y divide-slate-100">
                                {courses.length === 0 ? (
                                  <div className="grid min-w-0 grid-cols-[1fr,60px,80px,80px] gap-2 px-4 py-3 text-sm text-muted-foreground">
                                    <span className="col-span-4">No courses yet.</span>
                                  </div>
                                ) : (
                                  courses.map((course) => (
                                    <div
                                      key={course.id}
                                      className="grid min-w-0 grid-cols-[1fr,60px,80px,80px] gap-2 px-4 py-2 text-sm text-slate-700"
                                    >
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Link
                                            to={`/courses/${course.id}`}
                                            className="truncate font-medium text-slate-700 underline underline-offset-2 hover:text-primary"
                                          >
                                            {course.code ?? course.name}
                                          </Link>
                                        </TooltipTrigger>
                                        <TooltipContent>{course.name}</TooltipContent>
                                      </Tooltip>
                                      <span className="text-right">{Number(course.credits).toFixed(1)}</span>
                                      <span className="text-right">{course.actualLetterGrade ?? "—"}</span>
                                      <span className="text-right">{course.desiredLetterGrade}</span>
                                    </div>
                                  ))
                                )}
                              </div>
                              <div className="grid min-w-0 grid-cols-[1fr,60px,80px,80px] gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                                <span>Semester total</span>
                                <span className="text-right">{totalCredits.toFixed(1)}</span>
                                <span className="text-right">{currentSemesterGpaDisplay}</span>
                                <span className="text-right">{targetSemesterGpaDisplay}</span>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </TooltipProvider>
                )}
              </CardContent>
            </Card>
          ))}

          <Card className="border-dashed border-slate-300 bg-white/70 shadow-sm">
            <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">Add a year</p>
                <p className="text-sm text-muted-foreground">Start a new academic year.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveModal("semester")}
                disabled={loading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add a year
              </Button>
            </CardContent>
          </Card>
        </div>

        {careerTargetActive && targetGpaMax !== null && targetGpaShortfall !== null ? (
          <Card className="border-slate-200 bg-slate-50/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Target GPA status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                You lost too many points to achieve your GPA.
              </p>
              <div className="flex flex-wrap gap-4 text-sm font-semibold text-slate-700">
                <span>Max achievable GPA: {targetGpaMax.toFixed(2)}</span>
                <span>Shortfall: {targetGpaShortfall.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {yearTargetLabelDisplay && yearTargetMax !== null && yearTargetShortfall !== null ? (
          <Card className="border-slate-200 bg-slate-50/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{yearTargetLabelDisplay} GPA status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                You lost too many points to achieve your GPA.
              </p>
              <div className="flex flex-wrap gap-4 text-sm font-semibold text-slate-700">
                <span>Max achievable GPA: {yearTargetMax.toFixed(2)}</span>
                <span>Shortfall: {yearTargetShortfall.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </main>

      <TargetGpaModal
        open={careerTargetModalOpen}
        onOpenChange={setCareerTargetModalOpen}
        title="Set Target GPA"
        description="Control target grades across all courses."
        toggleLabel="Set Target GPA"
        enabled={careerTargetActive}
        targetGpa={targetGpaSession?.targetGpa ?? null}
        locked={careerTargetLocked}
        lockedMessage={careerTargetLocked ? targetGpaLockedMessage : undefined}
        onSave={handleCareerTargetSave}
      />

      <TargetGpaModal
        open={yearTargetIndex !== null}
        onOpenChange={(open) => !open && setYearTargetIndex(null)}
        title={`Edit ${yearTargetLabelDisplay ?? yearTargetLabel}`}
        description="Set a GPA target for this academic year."
        toggleLabel="Set Year GPA"
        enabled={activeYearTarget}
        targetGpa={activeYearTarget ? targetGpaSession?.targetGpa ?? null : null}
        locked={yearTargetLocked}
        lockedMessage={yearTargetLocked ? targetGpaLockedMessage : undefined}
        onSave={handleYearTargetSave}
      />

      <SemesterModal
        open={activeModal === "semester"}
        onOpenChange={(open) => {
          if (!open) {
            setActiveModal(null);
            setEditingSemester(null);
          }
        }}
        onSubmit={(data: SemesterFormData) => {
          if (editingSemester) updateSemester(editingSemester.id, data);
          else createSemester(data);
        }}
        targetGpa={
          editingSemester
            ? {
                enabled: semesterTargetActive,
                value: semesterTargetActive ? targetGpaSession?.targetGpa ?? null : null,
                locked: semesterTargetLocked,
                lockedMessage: semesterTargetLocked ? targetGpaLockedMessage : undefined,
                onSave: handleSemesterTargetSave,
              }
            : undefined
        }
        onDelete={
          editingSemester
            ? () => deleteSemester(editingSemester.id)
            : undefined
        }
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

      <Dialog open={yearEditIndex !== null} onOpenChange={(open) => !open && setYearEditIndex(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit year</DialogTitle>
            <DialogDescription>Update the label shown for this year.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="year-label">Year name</Label>
            <Input
              id="year-label"
              placeholder="Freshman"
              value={yearEditName}
              onChange={(event) => setYearEditName(event.target.value)}
            />
          </div>
          <DialogFooter className="flex w-full flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (yearEditIndex !== null) setYearDeleteIndex(yearEditIndex);
              }}
              disabled={loading}
            >
              Delete year
            </Button>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setYearEditIndex(null)} disabled={loading}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSaveYearLabel} disabled={loading}>
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={yearDeleteIndex !== null} onOpenChange={(open) => !open && setYearDeleteIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {yearDeleteIndex !== null ? yearLabels[yearDeleteIndex] ?? "this year" : "this year"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This deletes every semester in the year and all related courses and assignments. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDeleteYear}
            >
              Delete year
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
