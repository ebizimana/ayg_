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
import { SemesterModal, TargetGpaModal, YearModal, type SemesterFormData, type YearFormData } from "@/components/modals";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { useToast } from "@/hooks/use-toast";
import { getStoredTier, useUserProfile, type UserTier } from "@/hooks/use-user-profile";
import { http } from "@/lib/http";
import { GraduationCap, Plus, Bell, User, Settings, LogOut, ChevronDown, Menu, X, MoreVertical, Lock } from "lucide-react";

type Semester = { id: string; name: string; startDate: string; endDate: string; yearId: string; createdAt?: string };
type Year = { id: string; name: string; startDate: string; endDate: string; semesters: Semester[]; createdAt?: string };
type Course = {
  id: string;
  name: string;
  code?: string;
  credits: number;
  desiredLetterGrade: string;
  actualLetterGrade?: string | null;
  sortOrder?: number;
  createdAt?: string;
  isDemo?: boolean;
};
type TargetGpaSession = {
  id: string;
  scope: "CAREER" | "YEAR" | "SEMESTER";
  targetGpa: number;
  yearId?: string | null;
  semesterId?: string | null;
  maxAchievableGpa?: number | null;
  gpaShortfall?: number | null;
};
type ModalType = "semester" | null;

const semesterSeasons = ["Fall", "Spring", "Summer", "Winter"];
const LAST_SEMESTER_KEY = "ayg_last_semester_id";

const parseSemesterName = (name: string) => {
  const [maybeSeason] = name.split(" ");
  const season = semesterSeasons.includes(maybeSeason) ? maybeSeason : "Fall";
  return { season };
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
  const { profile, refresh: refreshProfile } = useUserProfile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null);
  const [years, setYears] = useState<Year[]>([]);
  const [coursesBySemester, setCoursesBySemester] = useState<Record<string, Course[]>>({});
  const [loading, setLoading] = useState(false);
  const [fieldOfStudy, setFieldOfStudy] = useState(localStorage.getItem("ayg_field_of_study") ?? "");
  const [targetGpaSessions, setTargetGpaSessions] = useState<TargetGpaSession[]>([]);
  const [careerTargetModalOpen, setCareerTargetModalOpen] = useState(false);
  const [activeYearId, setActiveYearId] = useState<string | null>(null);
  const [editingYear, setEditingYear] = useState<Year | null>(null);
  const [yearModalOpen, setYearModalOpen] = useState(false);
  const [yearDeleteTarget, setYearDeleteTarget] = useState<Year | null>(null);
  const [draggedSemesterId, setDraggedSemesterId] = useState<string | null>(null);
  const [upgradeDialog, setUpgradeDialog] = useState<{ title: string; description: string } | null>(null);

  const token = useMemo(() => localStorage.getItem("ayg_token"), []);
  const tier: UserTier | null = profile?.tier ?? getStoredTier();
  const isFree = tier === "FREE";

  useEffect(() => {
    if (!token) {
      nav("/auth?mode=login");
      return;
    }
    loadYears();
    loadTargetGpaSession();
  }, [token]);

  const createSemester = async (form: SemesterFormData) => {
    if (!activeYearId) {
      toast({
        title: "Select a year",
        description: "Choose an academic year before adding a semester.",
        variant: "destructive",
      });
      return;
    }
    if (isFree) {
      if (totalSemesters >= semesterLimit) {
        openUpgradeDialog(
          "Semester limit reached",
          "Free tier allows 1 semester. Upgrade to add more.",
        );
        return;
      }
      if (allowedYearId && activeYearId !== allowedYearId) {
        openUpgradeDialog(
          "Upgrade to add semesters",
          "Free tier limits semesters to your first year.",
        );
        return;
      }
    }
    setLoading(true);
    try {
      const activeYear = years.find((year) => year.id === activeYearId) ?? null;
      const yearValue = activeYear
        ? String(new Date(activeYear.startDate).getFullYear())
        : String(new Date().getFullYear());
      const name = form.name || `${form.season} ${yearValue}`;
      const payload = {
        yearId: activeYearId,
        name,
      };
      const created = await http<Semester>("/semesters", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setYears((prev) =>
        prev.map((year) =>
          year.id === activeYearId
            ? { ...year, semesters: [created, ...year.semesters] }
            : year,
        ),
      );
      setCoursesBySemester((prev) => ({ ...prev, [created.id]: [] }));
      void refreshProfile();
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
    if (isFree && lockedSemesterIds.has(semesterId)) {
      openUpgradeDialog(
        "Semester locked on Free",
        "Upgrade to edit additional semesters.",
      );
      return;
    }
    setLoading(true);
    try {
      const parentYear =
        years.find((year) => year.semesters.some((semester) => semester.id === semesterId)) ?? null;
      const yearValue = parentYear
        ? String(new Date(parentYear.startDate).getFullYear())
        : String(new Date().getFullYear());
      const name = form.name || `${form.season} ${yearValue}`;
      const payload = {
        name,
      };
      const updated = await http<Semester>(`/semesters/${semesterId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setYears((prev) =>
        prev.map((year) => ({
          ...year,
          semesters: year.semesters.map((semester) =>
            semester.id === semesterId ? updated : semester,
          ),
        })),
      );
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
    if (isFree) {
      openUpgradeDialog(
        "Delete locked on Free",
        "Upgrade to delete semesters.",
      );
      return;
    }
    setLoading(true);
    try {
      await http(`/semesters/${semesterId}`, { method: "DELETE" });
      setYears((prev) =>
        prev.map((year) => ({
          ...year,
          semesters: year.semesters.filter((semester) => semester.id !== semesterId),
        })),
      );
      setCoursesBySemester((prev) => {
        const next = { ...prev };
        delete next[semesterId];
        return next;
      });
      void refreshProfile();
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

  const createYear = async (form: YearFormData) => {
    if (isFree && years.length >= yearLimit) {
      openUpgradeDialog(
        "Year limit reached",
        "Free tier allows 1 year. Upgrade to add more.",
      );
      return;
    }
    setLoading(true);
    try {
      const created = await http<Year>("/years", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setYears((prev) => [...prev, { ...created, semesters: [] }]);
      void refreshProfile();
      toast({ title: "Year added", description: created.name });
    } catch (err) {
      toast({
        title: "Failed to add year",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateYear = async (yearId: string, form: YearFormData) => {
    if (isFree && lockedYearIds.has(yearId)) {
      openUpgradeDialog(
        "Year locked on Free",
        "Upgrade to edit additional years.",
      );
      return;
    }
    setLoading(true);
    try {
      const updated = await http<Year>(`/years/${yearId}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      setYears((prev) =>
        prev.map((year) =>
          year.id === yearId ? { ...year, ...updated } : year,
        ),
      );
      toast({ title: "Year updated", description: updated.name });
    } catch (err) {
      toast({
        title: "Failed to update year",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteYear = async (year: Year) => {
    if (isFree) {
      openUpgradeDialog(
        "Delete locked on Free",
        "Upgrade to delete years.",
      );
      return;
    }
    setLoading(true);
    try {
      await http(`/years/${year.id}`, { method: "DELETE" });
      setYears((prev) => prev.filter((item) => item.id !== year.id));
      setCoursesBySemester((prev) => {
        const next = { ...prev };
        year.semesters.forEach((semester) => {
          delete next[semester.id];
        });
        return next;
      });
      void refreshProfile();
      toast({ title: "Year deleted", description: year.name });
      await loadTargetGpaSession();
    } catch (err) {
      toast({
        title: "Failed to delete year",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const moveSemesterToYear = async (semesterId: string, targetYearId: string) => {
    if (isFree) {
      openUpgradeDialog(
        "Upgrade to move semesters",
        "Free tier limits semesters to their original year.",
      );
      return;
    }
    const sourceYear = years.find((year) => year.semesters.some((semester) => semester.id === semesterId));
    if (!sourceYear || sourceYear.id === targetYearId) return;
    setLoading(true);
    try {
      const updated = await http<Semester>(`/semesters/${semesterId}`, {
        method: "PATCH",
        body: JSON.stringify({ yearId: targetYearId }),
      });
      setYears((prev) =>
        prev.map((year) => {
          if (year.id === sourceYear.id) {
            return {
              ...year,
              semesters: year.semesters.filter((semester) => semester.id !== semesterId),
            };
          }
          if (year.id === targetYearId) {
            return {
              ...year,
              semesters: [updated, ...year.semesters],
            };
          }
          return year;
        }),
      );
      await loadTargetGpaSession();
      toast({
        title: "Semester moved",
        description: `Moved to ${years.find((year) => year.id === targetYearId)?.name ?? "year"}.`,
      });
    } catch (err) {
      toast({
        title: "Failed to move semester",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSeasonFromName = (name: string) => {
    const [maybeSeason] = name.split(" ");
    return semesterSeasons.includes(maybeSeason) ? maybeSeason : null;
  };

  const getDisabledSeasonsForYear = (yearId: string | null, currentSeason?: string) => {
    if (!yearId) return [];
    const year = years.find((item) => item.id === yearId);
    if (!year) return [];
    const seasons = year.semesters
      .map((semester) => getSeasonFromName(semester.name))
      .filter((season): season is string => !!season);
    return seasons.filter((season) => season !== currentSeason);
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
      await loadYears();
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
    if (!editingYear) return;
    setLoading(true);
    try {
      if (enabled && value !== undefined) {
        await http("/target-gpa/enable", {
          method: "POST",
          body: JSON.stringify({ scope: "YEAR", targetGpa: value, yearId: editingYear.id }),
        });
      } else {
        await http("/target-gpa/disable", {
          method: "POST",
          body: JSON.stringify({ scope: "YEAR", yearId: editingYear.id }),
        });
      }
      await loadTargetGpaSession();
      await loadYears();
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
      await loadYears();
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

  const loadYears = async () => {
    try {
      const data = await http<Year[]>("/years");
      setYears(data ?? []);
      const allSemesters = (data ?? []).flatMap((year) => year.semesters);
      if (allSemesters.length) {
        loadCoursesForSemesters(allSemesters);
      } else {
        setCoursesBySemester({});
      }
    } catch (err) {
      toast({
        title: "Failed to load years",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const loadTargetGpaSession = async () => {
    try {
      const sessions = await http<TargetGpaSession[]>("/target-gpa/active");
      setTargetGpaSessions(sessions ?? []);
    } catch (err) {
      toast({
        title: "Failed to load target GPA",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const yearCards = useMemo(
    () => [...years].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    [years],
  );
  const semesterYearMap = useMemo(() => {
    const map = new Map<string, string>();
    years.forEach((year) => {
      year.semesters.forEach((semester) => {
        map.set(semester.id, year.id);
      });
    });
    return map;
  }, [years]);

  const careerTargetSession = targetGpaSessions.find((session) => session.scope === "CAREER") ?? null;
  const yearTargetSessions = targetGpaSessions.filter((session) => session.scope === "YEAR");
  const semesterTargetSessions = targetGpaSessions.filter((session) => session.scope === "SEMESTER");
  const yearTargetDisplaySession = yearTargetSessions[0] ?? null;
  const careerTargetActive = !!careerTargetSession;
  const careerTargetLocked = targetGpaSessions.some((session) => session.scope !== "CAREER");
  const targetGpaLockedMessage = careerTargetActive
    ? "Career Target GPA is already active."
    : yearTargetSessions.length
      ? "Year Target GPA is already active."
      : semesterTargetSessions.length
        ? "Semester Target GPA is already active."
        : "";
  const yearTargetLabelDisplay =
    yearTargetDisplaySession
      ? years.find((year) => year.id === yearTargetDisplaySession.yearId)?.name ?? "Year"
      : null;
  const yearTargetShortfall =
    yearTargetDisplaySession ? yearTargetDisplaySession?.gpaShortfall ?? null : null;
  const yearTargetMax =
    yearTargetDisplaySession ? yearTargetDisplaySession?.maxAchievableGpa ?? null : null;

  const activeYearTarget =
    !!editingYear &&
    targetGpaSessions.some(
      (session) => session.scope === "YEAR" && session.yearId === editingYear.id,
    );
  const hasSemesterTargetsInYear = (yearId: string) =>
    semesterTargetSessions.some(
      (session) => session.semesterId && semesterYearMap.get(session.semesterId) === yearId,
    );
  const yearTargetLocked =
    !!editingYear &&
    !activeYearTarget &&
    (careerTargetActive || hasSemesterTargetsInYear(editingYear.id));
  const semesterTargetActive =
    !!editingSemester &&
    targetGpaSessions.some(
      (session) => session.scope === "SEMESTER" && session.semesterId === editingSemester.id,
    );
  const semesterYearTargetActive =
    !!editingSemester &&
    targetGpaSessions.some(
      (session) =>
        session.scope === "YEAR" &&
        session.yearId === semesterYearMap.get(editingSemester.id),
    );
  const semesterTargetLocked =
    !!editingSemester &&
    !semesterTargetActive &&
    (careerTargetActive || semesterYearTargetActive);
  const editingYearTargetSession =
    editingYear
      ? yearTargetSessions.find((session) => session.yearId === editingYear.id) ?? null
      : null;
  const editingSemesterTargetSession =
    editingSemester
      ? semesterTargetSessions.find((session) => session.semesterId === editingSemester.id) ?? null
      : null;
  const hasYearTarget = (yearId: string) =>
    yearTargetSessions.some((session) => session.yearId === yearId);
  const hasSemesterTarget = (semesterId: string) =>
    semesterTargetSessions.some((session) => session.semesterId === semesterId);
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
  const targetGpaDisplay = careerTargetActive
    ? careerTargetSession?.targetGpa.toFixed(2) ?? "—"
    : computedTargetGpaDisplay;
  const targetGpaNote = careerTargetActive ? "Target GPA set. Configure to change." : null;
  const targetGpaShortfall = careerTargetActive ? careerTargetSession?.gpaShortfall ?? null : null;
  const targetGpaMax = careerTargetActive ? careerTargetSession?.maxAchievableGpa ?? null : null;
  const totalSemesters = useMemo(
    () => years.reduce((sum, year) => sum + year.semesters.length, 0),
    [years],
  );
  const totalCourses = allCourses.filter((course) => !course.isDemo).length;
  const totalCredits = allCourses.reduce((sum, course) => sum + (Number(course.credits) || 0), 0);
  const activeYearTargets = yearTargetSessions.length;
  const activeSemesterTargets = semesterTargetSessions.length;
  const freeLimits = { years: 1, semesters: 1, courses: 3 };
  const limits = profile?.limits ?? freeLimits;
  const yearLimit = limits.years ?? freeLimits.years;
  const semesterLimit = limits.semesters ?? freeLimits.semesters;
  const courseLimit = limits.courses ?? freeLimits.courses;

  const sortedYearsByStart = useMemo(
    () => [...years].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    [years],
  );
  const allowedYearId = isFree ? sortedYearsByStart[0]?.id ?? null : null;
  const allowedSemesterId = useMemo(() => {
    if (!isFree || !allowedYearId) return null;
    const year = years.find((item) => item.id === allowedYearId);
    if (!year) return null;
    const sorted = [...year.semesters].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );
    return sorted[0]?.id ?? null;
  }, [allowedYearId, isFree, years]);
  const allowedCourseIds = useMemo(() => {
    if (!isFree || !allowedSemesterId) return new Set<string>();
    const courses = [...(coursesBySemester[allowedSemesterId] ?? [])].filter((course) => !course.isDemo);
    courses.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return new Set(courses.slice(0, courseLimit).map((course) => course.id));
  }, [allowedSemesterId, coursesBySemester, courseLimit, isFree]);
  const lockedYearIds = useMemo(() => {
    if (!isFree) return new Set<string>();
    return new Set(sortedYearsByStart.filter((year) => year.id !== allowedYearId).map((year) => year.id));
  }, [allowedYearId, isFree, sortedYearsByStart]);
  const lockedSemesterIds = useMemo(() => {
    if (!isFree) return new Set<string>();
    const ids: string[] = [];
    years.forEach((year) => {
      year.semesters.forEach((semester) => {
        if (semester.id !== allowedSemesterId) ids.push(semester.id);
      });
    });
    return new Set(ids);
  }, [allowedSemesterId, isFree, years]);
  const lockedCourseIds = useMemo(() => {
    if (!isFree) return new Set<string>();
    const ids: string[] = [];
    Object.values(coursesBySemester).forEach((courseList) => {
      courseList.forEach((course) => {
        if (!course.isDemo && !allowedCourseIds.has(course.id)) ids.push(course.id);
      });
    });
    return new Set(ids);
  }, [allowedCourseIds, coursesBySemester, isFree]);
  const yearQuota = isFree ? `${years.length}/${yearLimit}` : "Unlimited";
  const semesterQuota = isFree ? `${totalSemesters}/${semesterLimit}` : "Unlimited";
  const courseQuota = isFree ? `${totalCourses}/${courseLimit}` : "Unlimited";

  const handleSemesterClick = (semesterId: string) => {
    localStorage.setItem(LAST_SEMESTER_KEY, semesterId);
    nav("/dashboard");
  };

  const signOut = () => {
    localStorage.clear();
    nav("/auth?mode=login");
  };

  const openUpgradeDialog = (title: string, description: string) => {
    setUpgradeDialog({ title, description });
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
                <DropdownMenuItem onClick={() => nav("/profile")}>
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
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => nav("/profile")}>
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
        {isFree ? (
          <Card className="border-slate-200">
            <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">Plan status</p>
                <p className="text-xs text-muted-foreground">
                  {isFree ? "Free tier limits apply." : "Paid tier unlocked."}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                <span className="rounded-full border border-slate-200 px-3 py-1">
                  Years: <span className="font-semibold text-slate-900">{yearQuota}</span>
                </span>
                <span className="rounded-full border border-slate-200 px-3 py-1">
                  Semesters: <span className="font-semibold text-slate-900">{semesterQuota}</span>
                </span>
                <span className="rounded-full border border-slate-200 px-3 py-1">
                  Courses: <span className="font-semibold text-slate-900">{courseQuota}</span>
                </span>
              </div>
            </CardContent>
          </Card>
        ) : null}
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
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Target GPA</CardTitle>
                {careerTargetActive ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    Active
                  </span>
                ) : null}
              </div>
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
          {yearCards.map((year) => {
            const isYearLocked = lockedYearIds.has(year.id);
            const canEditYear = !isFree || !isYearLocked;
            const canAddSemester = !isFree || (!isYearLocked && totalSemesters < semesterLimit);
            return (
            <Card
              key={year.id}
              className={`border-slate-200 shadow-sm ${isYearLocked ? "opacity-70" : ""}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (draggedSemesterId) {
                  void moveSemesterToYear(draggedSemesterId, year.id);
                  setDraggedSemesterId(null);
                }
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-2">
                  <Button
                    variant="link"
                    className="h-auto p-0 text-lg font-semibold underline underline-offset-4"
                    onClick={() => {
                      if (!canEditYear) {
                        openUpgradeDialog(
                          "Year locked on Free",
                          "Upgrade to edit additional years.",
                        );
                        return;
                      }
                      setEditingYear(year);
                      setYearModalOpen(true);
                    }}
                  >
                    {year.name}
                  </Button>
                  {isYearLocked ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
                      <Lock className="h-3 w-3" />
                      Locked
                    </span>
                  ) : null}
                  {hasYearTarget(year.id) ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      Target GPA
                    </span>
                  ) : null}
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
                          if (!canEditYear) {
                            openUpgradeDialog(
                              "Year locked on Free",
                              "Upgrade to edit additional years.",
                            );
                            return;
                          }
                          setEditingYear(year);
                          setYearModalOpen(true);
                        }}
                      >
                        Edit year
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={(event) => {
                          event.preventDefault();
                          if (isFree) {
                            openUpgradeDialog(
                              "Delete locked on Free",
                              "Upgrade to delete years.",
                            );
                            return;
                          }
                          setYearDeleteTarget(year);
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
                    onClick={() => {
                      if (!canAddSemester) {
                        openUpgradeDialog(
                          "Semester limit reached",
                          "Free tier allows 1 semester. Upgrade to add more.",
                        );
                        return;
                      }
                      if (isFree && allowedYearId && allowedYearId !== year.id) {
                        openUpgradeDialog(
                          "Upgrade to add semesters",
                          "Free tier limits semesters to your first year.",
                        );
                        return;
                      }
                      setActiveYearId(year.id);
                      setActiveModal("semester");
                    }}
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
                        const isSemesterLocked = lockedSemesterIds.has(semester.id);
                        const courses = coursesBySemester[semester.id] ?? [];
                        const totalCredits = courses.reduce((sum, course) => sum + (Number(course.credits) || 0), 0);
                        const currentSemesterGpa = calculateGpa(courses, (course) => course.actualLetterGrade);
                        const targetSemesterGpa = calculateGpa(
                          courses.filter((course) => course.desiredLetterGrade),
                          (course) => course.desiredLetterGrade,
                        );
                        const currentSemesterGpaDisplay = currentSemesterGpa === null ? "—" : currentSemesterGpa.toFixed(2);
                        const targetSemesterGpaDisplay = targetSemesterGpa === null ? "—" : targetSemesterGpa.toFixed(2);
                        return (
                          <Card
                            key={semester.id}
                            className={`border-slate-200 shadow-sm ${isSemesterLocked ? "opacity-70" : ""}`}
                            draggable={!isFree}
                            onDragStart={(event) => {
                              event.dataTransfer.setData("text/plain", semester.id);
                              setDraggedSemesterId(semester.id);
                            }}
                            onDragEnd={() => setDraggedSemesterId(null)}
                          >
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
                                  {isSemesterLocked ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                                      <Lock className="h-3 w-3" />
                                      Locked
                                    </span>
                                  ) : null}
                                  {hasSemesterTarget(semester.id) ? (
                                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                      Target GPA
                                    </span>
                                  ) : null}
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
                                          if (isFree && isSemesterLocked) {
                                            openUpgradeDialog(
                                              "Semester locked on Free",
                                              "Upgrade to edit additional semesters.",
                                            );
                                            return;
                                          }
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
                                  courses.map((course) => {
                                    const isCourseLocked = lockedCourseIds.has(course.id);
                                    return (
                                      <div
                                        key={course.id}
                                        className={`grid min-w-0 grid-cols-[1fr,60px,80px,80px] gap-2 px-4 py-2 text-sm ${
                                          isCourseLocked ? "text-slate-400" : "text-slate-700"
                                        }`}
                                      >
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Link
                                              to={`/courses/${course.id}`}
                                              className="flex items-center gap-2 truncate font-medium text-slate-700 underline underline-offset-2 hover:text-primary"
                                            >
                                              {isCourseLocked ? <Lock className="h-3 w-3 text-slate-400" /> : null}
                                              {course.code ?? course.name}
                                            </Link>
                                          </TooltipTrigger>
                                          <TooltipContent>{course.name}</TooltipContent>
                                        </Tooltip>
                                        <span className="text-right">{Number(course.credits).toFixed(1)}</span>
                                        <span className="text-right">{course.actualLetterGrade ?? "—"}</span>
                                        <span className="text-right">{course.desiredLetterGrade}</span>
                                      </div>
                                    );
                                  })
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
          );
        })}

          <Card className="border-dashed border-slate-300 bg-white/70 shadow-sm">
            <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">Add a year</p>
                <p className="text-sm text-muted-foreground">Start a new academic year.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (isFree && years.length >= yearLimit) {
                    openUpgradeDialog(
                      "Year limit reached",
                      "Free tier allows 1 year. Upgrade to add more.",
                    );
                    return;
                  }
                  setEditingYear(null);
                  setYearModalOpen(true);
                }}
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

        <Card className="border-slate-200 bg-white/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Credits tracked</p>
              <p className="text-2xl font-semibold text-slate-900">{totalCredits.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">{years.length} years • {totalSemesters} semesters</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Active targets</p>
              <p className="text-2xl font-semibold text-slate-900">
                {careerTargetActive ? "Career" : activeYearTargets + activeSemesterTargets}
              </p>
              <p className="text-xs text-muted-foreground">
                {careerTargetActive
                  ? "Career target enabled"
                  : `${activeYearTargets} year • ${activeSemesterTargets} semester`}
              </p>
            </div>
            {careerTargetActive && targetGpaMax !== null && targetGpaShortfall !== null ? (
              <div className="col-span-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                Max achievable GPA: {targetGpaMax.toFixed(2)} • Shortfall: {targetGpaShortfall.toFixed(2)}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </main>

      <TargetGpaModal
        open={careerTargetModalOpen}
        onOpenChange={setCareerTargetModalOpen}
        title="Set Target GPA"
        description="Control target grades across all courses."
        toggleLabel="Set Target GPA"
        enabled={careerTargetActive}
        targetGpa={careerTargetSession?.targetGpa ?? null}
        locked={careerTargetLocked}
        lockedMessage={careerTargetLocked ? targetGpaLockedMessage : undefined}
        onSave={handleCareerTargetSave}
      />

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

      <SemesterModal
        open={activeModal === "semester"}
        onOpenChange={(open) => {
          if (!open) {
            setActiveModal(null);
            setEditingSemester(null);
            setActiveYearId(null);
          }
        }}
        disabledSeasons={
          editingSemester
            ? getDisabledSeasonsForYear(editingSemester.yearId, getSeasonFromName(editingSemester.name) ?? undefined)
            : getDisabledSeasonsForYear(activeYearId)
        }
        onSubmit={(data: SemesterFormData) => {
          if (editingSemester) updateSemester(editingSemester.id, data);
          else createSemester(data);
        }}
        targetGpa={
          editingSemester
            ? {
                enabled: semesterTargetActive,
                value: semesterTargetActive ? editingSemesterTargetSession?.targetGpa ?? null : null,
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
        deleteDisabled={isFree}
        deleteDisabledMessage={isFree ? "Delete is locked on the Free tier." : undefined}
        initialData={
          editingSemester
            ? {
                name: editingSemester.name,
                ...parseSemesterName(editingSemester.name),
              }
            : undefined
        }
      />

      <YearModal
        open={yearModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setYearModalOpen(false);
            setEditingYear(null);
          }
        }}
        targetGpa={
          editingYear
            ? {
                enabled: activeYearTarget,
                value: activeYearTarget ? editingYearTargetSession?.targetGpa ?? null : null,
                locked: yearTargetLocked,
                lockedMessage: yearTargetLocked ? targetGpaLockedMessage : undefined,
                onSave: handleYearTargetSave,
              }
            : undefined
        }
        initialData={
          editingYear
            ? {
                name: editingYear.name,
                startDate: editingYear.startDate.slice(0, 10),
                endDate: editingYear.endDate.slice(0, 10),
              }
            : undefined
        }
        onSubmit={(data: YearFormData) => {
          if (editingYear) updateYear(editingYear.id, data);
          else createYear(data);
        }}
        onDelete={
          editingYear ? () => deleteYear(editingYear) : undefined
        }
        deleteDisabled={isFree}
        deleteDisabledMessage={isFree ? "Delete is locked on the Free tier." : undefined}
      />

      <AlertDialog open={!!yearDeleteTarget} onOpenChange={(open) => !open && setYearDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {yearDeleteTarget?.name ?? "this year"}?
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
              onClick={() => {
                if (yearDeleteTarget) {
                  void deleteYear(yearDeleteTarget);
                  setYearDeleteTarget(null);
                }
              }}
            >
              Delete year
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
