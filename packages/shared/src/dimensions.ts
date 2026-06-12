import { z } from "zod";

/**
 * Bemassungs-Anker für die 3D-Vorschau – spiegelt
 * services/cad/app/dimensions.py:DimensionSpec. Die Anker kommen vom
 * CAD-Service (POST /dimensions): die gemessene Strecke p1→p2 liegt auf der
 * Geometrie (Template-Koordinaten, effektive/toleranzierte Masse), offset_dir
 * ist die Richtung, in der die Masslinie nach aussen versetzt wird.
 */

export const Vec3 = z.tuple([z.number(), z.number(), z.number()]);
export type Vec3 = z.infer<typeof Vec3>;

export const DimensionSpec = z.object({
  param: z.string(),
  kind: z.enum(["linear", "diameter"]),
  p1: Vec3,
  p2: Vec3,
  offset_dir: Vec3,
});
export type DimensionSpec = z.infer<typeof DimensionSpec>;

/** Antwort von POST /api/cad/dimensions. */
export const DimensionsResponse = z.object({
  archetype: z.string(),
  dims: z.array(DimensionSpec),
});
export type DimensionsResponse = z.infer<typeof DimensionsResponse>;
