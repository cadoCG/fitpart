import { z } from "zod";
import { FitClass } from "../tolerance";

/** Endkappe Rohr/Profil – spiegelt app/templates/end_cap.py:EndCapParams. */
export const EndCapParams = z.object({
  outer_w: z.number().gte(8).lte(120),
  outer_d: z.number().gte(8).lte(120).default(20),
  wall: z.number().gte(1.6).lte(6).default(2),
  depth: z.number().gte(6).lte(80).default(20),
  shape: z.enum(["round", "square", "rect"]).default("round"),
  fit: FitClass.default("snug"),
});
export type EndCapParams = z.infer<typeof EndCapParams>;
