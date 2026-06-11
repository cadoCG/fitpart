import type { ToleranceProfile } from "@fitpart/shared";

// Persistenz des Kalibrier-Profils. Vorläufig localStorage; später Supabase
// (printer_profiles, Briefing 8). Ein Profil reicht für den MVP/Free-Plan.
const KEY = "fitpart.profile";

export function loadProfile(): ToleranceProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ToleranceProfile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(profile: ToleranceProfile): void {
  window.localStorage.setItem(KEY, JSON.stringify(profile));
}

export function clearProfile(): void {
  window.localStorage.removeItem(KEY);
}
