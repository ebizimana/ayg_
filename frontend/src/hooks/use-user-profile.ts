import { useCallback, useEffect, useState } from "react";
import { http } from "@/lib/http";

export type UserTier = "FREE" | "PAID";

export type UserProfile = {
  id: string;
  email: string;
  tier: UserTier;
  usage: { years: number; semesters: number; courses: number };
  limits: { years: number | null; semesters: number | null; courses: number | null };
};

const STORAGE_KEY = "ayg_tier";

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await http<UserProfile>("/users/me");
      setProfile(data ?? null);
      if (data?.tier) localStorage.setItem(STORAGE_KEY, data.tier);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { profile, loading, refresh, setProfile };
}

export function getStoredTier(): UserTier | null {
  const value = localStorage.getItem(STORAGE_KEY);
  return value === "FREE" || value === "PAID" ? value : null;
}
