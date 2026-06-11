import { z } from "zod";
import { FitClass } from "../tolerance";

/** Rohr-/Stangenclip – spiegelt app/templates/pipe_clip.py:PipeClipParams. */
export const PipeClipParams = z.object({
  pipe_d: z.number().gte(3).lte(120),
  width: z.number().gte(5).lte(100).default(10),
  wall: z.number().gte(1.6).lte(10).default(2.4),
  opening_ratio: z.number().gte(0.4).lte(0.95).default(0.72),
  screw_d: z.number().gte(2).lte(8).default(4),
  fit: FitClass.default("snug"),
});
export type PipeClipParams = z.infer<typeof PipeClipParams>;
