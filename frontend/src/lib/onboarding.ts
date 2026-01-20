const STORAGE_KEYS = {
  yearDone: "ayg_onboarding_year_done",
  semesterDone: "ayg_onboarding_semester_done",
  courseDone: "ayg_onboarding_course_done",
  assignmentCount: "ayg_onboarding_assignment_count",
  helpDone: "ayg_onboarding_help_done",
  profileNameDone: "ayg_onboarding_profile_name_done",
  profilePhotoDone: "ayg_onboarding_profile_photo_done",
  themeDone: "ayg_onboarding_theme_done",
} as const;

export type OnboardingStatus = {
  yearDone: boolean;
  semesterDone: boolean;
  courseDone: boolean;
  assignmentCount: number;
  helpDone: boolean;
  profileNameDone: boolean;
  profilePhotoDone: boolean;
  themeDone: boolean;
};

const readFlag = (key: string) => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(key) === "true";
};

const readValue = (key: string) => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key);
};

const readCount = (key: string) => {
  if (typeof window === "undefined") return 0;
  const value = Number(localStorage.getItem(key) ?? 0);
  return Number.isFinite(value) ? value : 0;
};

const writeFlag = (key: string, value: boolean) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, value ? "true" : "false");
};

const writeCount = (key: string, value: number) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, String(Math.max(0, Math.floor(value))));
};

export const notifyOnboardingUpdate = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("ayg_onboarding_refresh"));
};

export const getOnboardingStatus = (): OnboardingStatus => ({
  yearDone: readFlag(STORAGE_KEYS.yearDone),
  semesterDone: readFlag(STORAGE_KEYS.semesterDone),
  courseDone: readFlag(STORAGE_KEYS.courseDone),
  assignmentCount: readCount(STORAGE_KEYS.assignmentCount),
  helpDone: readFlag(STORAGE_KEYS.helpDone),
  profileNameDone:
    readFlag(STORAGE_KEYS.profileNameDone) ||
    Boolean(readValue("ayg_display_name")?.trim()),
  profilePhotoDone:
    readFlag(STORAGE_KEYS.profilePhotoDone) ||
    Boolean(readValue("ayg_profile_photo")),
  themeDone:
    readFlag(STORAGE_KEYS.themeDone) ||
    Boolean(readValue("theme")),
});

export const setOnboardingYearDone = () => {
  writeFlag(STORAGE_KEYS.yearDone, true);
  notifyOnboardingUpdate();
};

export const setOnboardingSemesterDone = () => {
  writeFlag(STORAGE_KEYS.semesterDone, true);
  notifyOnboardingUpdate();
};

export const setOnboardingCourseDone = () => {
  writeFlag(STORAGE_KEYS.courseDone, true);
  notifyOnboardingUpdate();
};

export const setOnboardingAssignmentCount = (count: number) => {
  const current = readCount(STORAGE_KEYS.assignmentCount);
  if (count <= current) return;
  writeCount(STORAGE_KEYS.assignmentCount, count);
  notifyOnboardingUpdate();
};

export const setOnboardingHelpDone = () => {
  writeFlag(STORAGE_KEYS.helpDone, true);
  notifyOnboardingUpdate();
};

export const setOnboardingProfileNameDone = () => {
  writeFlag(STORAGE_KEYS.profileNameDone, true);
  notifyOnboardingUpdate();
};

export const setOnboardingProfilePhotoDone = () => {
  writeFlag(STORAGE_KEYS.profilePhotoDone, true);
  notifyOnboardingUpdate();
};

export const setOnboardingThemeDone = () => {
  writeFlag(STORAGE_KEYS.themeDone, true);
  notifyOnboardingUpdate();
};

export const incrementOnboardingAssignmentCount = (by = 1) => {
  const current = readCount(STORAGE_KEYS.assignmentCount);
  writeCount(STORAGE_KEYS.assignmentCount, current + by);
  notifyOnboardingUpdate();
};

export const markOnboardingFromCounts = (counts: {
  years?: number;
  semesters?: number;
  courses?: number;
}) => {
  if (counts.years && counts.years > 0) writeFlag(STORAGE_KEYS.yearDone, true);
  if (counts.semesters && counts.semesters > 0) writeFlag(STORAGE_KEYS.semesterDone, true);
  if (counts.courses && counts.courses > 0) writeFlag(STORAGE_KEYS.courseDone, true);
  notifyOnboardingUpdate();
};
