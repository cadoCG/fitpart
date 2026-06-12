import { z } from "zod";
import { ToleranceProfile } from "./tolerance";

/**
 * fit_feedback-Loop (Briefing 8): Jeder Download protokolliert ein Teil,
 * ~48 h später fragt die App "Hat's gepasst?". Das Verdict + Toleranz-Snapshot
 * ist das Lernsignal für die Toleranz-Engine.
 */

export const FitVerdict = z.enum(["fits", "too_tight", "too_loose", "not_printed"]);
export type FitVerdict = z.infer<typeof FitVerdict>;

/** Request-Body für POST /api/parts (Download-Protokoll). */
export const PartRecordInput = z.object({
  archetype: z.string().max(40),
  params: z.record(z.unknown()),
  tolerance_profile: ToleranceProfile.optional(),
  // Bewusst lokal statt ExportFormat aus index.ts (zirkulärer Import).
  format: z.enum(["stl", "3mf", "step"]),
});
export type PartRecordInput = z.infer<typeof PartRecordInput>;

/** Antwort von POST /api/parts – Token ist die Feedback-Capability. */
export const PartRecord = z.object({
  id: z.string().uuid(),
  feedback_token: z.string().uuid(),
});
export type PartRecord = z.infer<typeof PartRecord>;

/** Request-Body für POST /api/feedback. */
export const FeedbackInput = z.object({
  token: z.string().uuid(),
  verdict: FitVerdict,
  // Optionaler Hinweis "wieviel hat gefehlt" (±2 mm, siehe submit_fit_feedback).
  offset_hint_mm: z.number().min(-2).max(2).optional(),
  comment: z.string().max(500).optional(),
});
export type FeedbackInput = z.infer<typeof FeedbackInput>;

/** Antwort von GET /api/feedback?token=… (via get_part_for_feedback). */
export const FeedbackPartInfo = z.object({
  archetype: z.string(),
  created_at: z.string(),
  has_feedback: z.boolean(),
});
export type FeedbackPartInfo = z.infer<typeof FeedbackPartInfo>;
