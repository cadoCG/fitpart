import { z } from "zod";

/** Referenzmasse + Leiter-Stufen – spiegeln app/calibration.py (fixes Protokoll). */
export const REFERENCE_PIN_MM = 5.0;
export const REFERENCE_TAB_MM = 2.0;

export const HOLE_LADDER_MM = [4.8, 4.9, 5.0, 5.1, 5.2, 5.4, 5.6] as const;
export const SHAFT_LADDER_MM = [4.6, 4.8, 5.0, 5.2] as const;
export const SLOT_LADDER_MM = [2.0, 2.2, 2.4] as const;

/** Coupon-Antworten des Nutzers – spiegelt app/calibration.py:CalibrationInput. */
export const CalibrationInput = z.object({
  snug_hole_mm: z.number().nullable().default(null),
  snug_shaft_mm: z.number().nullable().default(null),
  snug_slot_mm: z.number().nullable().default(null),
  nozzle_mm: z.number().positive().default(0.4),
});
export type CalibrationInput = z.infer<typeof CalibrationInput>;
