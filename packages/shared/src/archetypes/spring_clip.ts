import { z } from "zod";
import { FitClass } from "../tolerance";

/** Halteklammer/Federclip – spiegelt app/templates/spring_clip.py:SpringClipParams. */
export const SpringClipParams = z
  .object({
    grip_d: z.number().gte(3).lte(60),
    opening: z.number().gte(0.3).lte(0.9).default(0.65),
    thickness: z.number().gte(1.2).lte(6).default(2.4),
    width: z.number().gte(4).lte(60).default(10),
    fit: FitClass.default("snug"),
  })
  .refine((p) => p.opening * p.grip_d >= 1, {
    message: "Mündung zu schmal (opening×grip_d ≥ 1 mm).",
    path: ["opening"],
  });
export type SpringClipParams = z.infer<typeof SpringClipParams>;
