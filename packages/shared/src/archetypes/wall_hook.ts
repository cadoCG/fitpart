import { z } from "zod";
import { FitClass } from "../tolerance";

/** Wandhaken – spiegelt app/templates/wall_hook.py:WallHookParams. */
export const WallHookParams = z
  .object({
    hook_depth: z.number().gt(2).lte(80),
    width: z.number().gte(8).lte(100),
    thickness: z.number().gte(2.4).lte(12).default(4),
    back_height: z.number().gte(20).lte(200),
    lip_height: z.number().gte(4).lte(80).default(12),
    screw_d: z.number().gte(2).lte(8).default(4),
    countersink: z.boolean().default(true),
    fit: FitClass.default("sliding"),
  })
  .refine((p) => p.back_height >= p.thickness + 4 * p.screw_d, {
    message: "back_height muss ≥ thickness + 4×screw_d sein.",
    path: ["back_height"],
  });
export type WallHookParams = z.infer<typeof WallHookParams>;
