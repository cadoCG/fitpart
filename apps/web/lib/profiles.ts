import type { ToleranceProfile } from "@fitpart/shared";
import { createClient } from "@/lib/supabase/client";
import { loadProfile as loadLocal, saveProfile as saveLocal } from "@/lib/profile";

/**
 * Drucker-Profile: Supabase (printer_profiles) für angemeldete User,
 * localStorage als anonymer Fallback. Alle Funktionen sind client-seitig –
 * RLS sorgt dafür, dass nur eigene Zeilen sichtbar sind.
 */

export type PrinterProfile = {
  id: string;
  name: string;
  nozzle_mm: number;
  hole_offset_mm: number;
  shaft_offset_mm: number;
  slot_offset_mm: number;
  calibrated: boolean;
  is_active: boolean;
  updated_at: string;
};

export function toTolerance(p: PrinterProfile): ToleranceProfile {
  return {
    nozzle_mm: Number(p.nozzle_mm),
    hole_offset_mm: Number(p.hole_offset_mm),
    shaft_offset_mm: Number(p.shaft_offset_mm),
    slot_offset_mm: Number(p.slot_offset_mm),
    calibrated: p.calibrated,
  };
}

export async function listProfiles(): Promise<PrinterProfile[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("printer_profiles")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data as PrinterProfile[];
}

/**
 * Kalibrier-Ergebnis speichern: angemeldet → neues aktives Cloud-Profil
 * (vorherige werden deaktiviert); zusätzlich immer localStorage, damit die
 * App offline/anonym weiter funktioniert.
 */
export async function saveCalibration(
  tolerance: ToleranceProfile,
  name = "Mein Drucker",
): Promise<{ cloud: boolean }> {
  saveLocal(tolerance);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { cloud: false };

  await supabase
    .from("printer_profiles")
    .update({ is_active: false })
    .eq("is_active", true);

  const { error } = await supabase.from("printer_profiles").insert({
    user_id: user.id,
    name,
    nozzle_mm: tolerance.nozzle_mm,
    hole_offset_mm: tolerance.hole_offset_mm,
    shaft_offset_mm: tolerance.shaft_offset_mm,
    slot_offset_mm: tolerance.slot_offset_mm,
    calibrated: tolerance.calibrated,
    is_active: true,
  });
  if (error) throw error;
  return { cloud: true };
}

export async function setActiveProfile(id: string): Promise<void> {
  const supabase = createClient();
  await supabase
    .from("printer_profiles")
    .update({ is_active: false })
    .eq("is_active", true);
  const { error } = await supabase
    .from("printer_profiles")
    .update({ is_active: true })
    .eq("id", id);
  if (error) throw error;
}

export async function renameProfile(id: string, name: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("printer_profiles")
    .update({ name })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteProfile(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("printer_profiles")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/** Aktives Toleranz-Profil: Cloud (angemeldet) vor localStorage (anonym). */
export async function loadActiveTolerance(): Promise<ToleranceProfile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data } = await supabase
      .from("printer_profiles")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();
    if (data) return toTolerance(data as PrinterProfile);
  }
  return loadLocal();
}
