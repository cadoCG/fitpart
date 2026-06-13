import { z } from "zod";
import { FitClass } from "../tolerance";

/** Möbelgleiter/Fusskappe – spiegelt app/templates/furniture_glide.py:FurnitureGlideParams. */
export const FurnitureGlideParams = z.object({
  leg_w: z.number().gte(5).lte(80),
  wall: z.number().gte(1.6).lte(6).default(2.4),
  height: z.number().gte(6).lte(60).default(18),
  shape: z.enum(["round", "square"]).default("round"),
  mount: z.enum(["outer", "inner"]).default("outer"),
  fit: FitClass.default("snug"),
});
export type FurnitureGlideParams = z.infer<typeof FurnitureGlideParams>;
