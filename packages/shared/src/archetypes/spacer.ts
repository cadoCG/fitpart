import { z } from "zod";
import { FitClass } from "../tolerance";

const MIN_WALL_RING_MM = 1.6;

/** Distanzhülse – spiegelt app/templates/spacer.py:SpacerParams. */
export const SpacerParams = z
  .object({
    inner_d: z.number().gt(1).lte(100).describe("Innen-⌀ (Schraube/Welle), mm"),
    outer_d: z.number().gt(2).lte(200).describe("Aussen-⌀, mm"),
    height: z.number().gt(0.4).lte(300).describe("Höhe, mm"),
    fit: FitClass.default("sliding"),
  })
  .refine((p) => p.outer_d > p.inner_d + MIN_WALL_RING_MM, {
    message: `outer_d muss > inner_d + ${MIN_WALL_RING_MM} sein (Wand zu dünn).`,
    path: ["outer_d"],
  });
export type SpacerParams = z.infer<typeof SpacerParams>;
