export const getDisplayName = () => {
  if (typeof window === "undefined") return "Profile";
  const name = localStorage.getItem("ayg_display_name")?.trim();
  if (name) return name;
  return localStorage.getItem("ayg_email") ?? "Profile";
};

export const getProfilePhoto = () => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("ayg_profile_photo") ?? "";
};

export const getProfileInitials = (label: string) => {
  const safe = label?.trim();
  if (!safe) return "A";
  const parts = safe.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return safe[0]?.toUpperCase() ?? "A";
};
