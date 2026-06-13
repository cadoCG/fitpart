import { z } from "zod";
import { FitClass } from "../tolerance";

/** Schnappdeckel – spiegelt app/templates/snap_lid.py:SnapLidParams. */
export const SnapLidParams = z.object({
  rim_d: z.number().gte(15).lte(200),
  wall: z.number().gte(1.6).lte(6).default(2),
  skirt_h: z.number().gte(5).lte(40).default(10),
  top_t: z.number().gte(1.2).lte(6).default(2),
  fit: FitClass.default("snug"),
});
export type SnapLidParams = z.infer<typeof SnapLidParams>;
