import { z } from "zod";

/**
 * Eingabe für POST /api/part-request – eine "kein passender Treffer"-Anfrage
 * (Warteliste). Speist die datengetriebene Archetyp-Roadmap (ADR-002).
 *
 * Das Foto wird nur bei explizitem Opt-in (share_photo) ausgewertet/gespeichert
 * – Datenschutz by default. Die Felder spiegeln public.part_requests.
 */
export const PartRequestInput = z.object({
  description: z.string().trim().min(3).max(2000),
  /** Bester (unsicherer) Treffer der Analyse, rein informativ. */
  suggested_archetype: z.string().max(40).optional(),
  /** archetype_confidence der Analyse (0–1). */
  confidence: z.number().min(0).max(1).optional(),
  /** Optionale Kontaktmöglichkeit für Benachrichtigung bei Release. */
  email: z.string().email().max(200).optional(),
  share_photo: z.boolean().default(false),
  /** Base64-JPEG (ohne data:-Präfix); nur wenn share_photo === true. */
  image: z.string().optional(),
  media_type: z.literal("image/jpeg").optional(),
});
export type PartRequestInput = z.infer<typeof PartRequestInput>;
