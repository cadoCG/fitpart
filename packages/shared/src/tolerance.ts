import { z } from "zod";

/** Passungsklasse – spiegelt app/tolerance.py:FitClass. */
export const FitClass = z.enum(["press", "snug", "sliding", "loose"]);
export type FitClass = z.infer<typeof FitClass>;

/** Feature-Typ für die Toleranzkompensation. */
export const FeatureType = z.enum(["hole", "shaft", "slot"]);
export type FeatureType = z.infer<typeof FeatureType>;

/** Konservative FDM-Default-Zuschläge (mm), siehe Briefing 7.2. */
export const DEFAULT_CLEARANCE_MM: Record<FitClass, number> = {
  press: 0.05,
  snug: 0.15,
  sliding: 0.25,
  loose: 0.4,
};

/** Drucker/Material-Profil aus dem Kalibrier-Coupon (spiegelt ToleranceProfile). */
export const ToleranceProfile = z.object({
  nozzle_mm: z.number().positive().default(0.4),
  hole_offset_mm: z.number().default(0),
  shaft_offset_mm: z.number().default(0),
  slot_offset_mm: z.number().default(0),
  calibrated: z.boolean().default(false),
});
export type ToleranceProfile = z.infer<typeof ToleranceProfile>;
