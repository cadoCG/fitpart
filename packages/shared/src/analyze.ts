import { z } from "zod";

/**
 * Vision-Analyse (Foto → Archetyp-Vorschlag). Das LLM klassifiziert nur und
 * schätzt abgeleitete Masse – die Mess-Fragen selbst sind statisch (i18n),
 * siehe CRITICAL_DIMS. Muss mit ARCHETYPE_SCHEMAS übereinstimmen
 * (Compile-Check in index.ts).
 */
export const ArchetypeEnum = z.enum([
  "spacer",
  "wall_hook",
  "l_bracket",
  "pipe_clip",
  "cable_clip",
  "device_holder",
]);

/**
 * Schwelle für die Vision-Sicherheit (ADR-002). Liegt archetype_confidence
 * darunter, zwingt die App das Foto nicht in eine womöglich falsche Vorlage,
 * sondern bietet den "kein passender Treffer"-Pfad an (Warteliste). Startwert –
 * anhand der Nutzungsdaten nachjustieren.
 */
export const ARCHETYPE_CONFIDENCE_THRESHOLD = 0.6;

/** Vom LLM aus dem Foto geschätztes Mass (Slider-korrigierbar, nie kritisch). */
export const DerivedDim = z.object({
  param: z.string(),
  value_mm: z.number(),
});
export type DerivedDim = z.infer<typeof DerivedDim>;

/** Antwort von POST /api/analyze (Structured Output, serverseitig validiert). */
export const AnalyzeResult = z.object({
  archetype: ArchetypeEnum,
  archetype_confidence: z.number().min(0).max(1),
  alternative_archetypes: z.array(ArchetypeEnum),
  derived_dims: z.array(DerivedDim),
  notes_de: z.string(),
});
export type AnalyzeResult = z.infer<typeof AnalyzeResult>;
