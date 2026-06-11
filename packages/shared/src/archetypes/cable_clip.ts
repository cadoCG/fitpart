import { z } from "zod";
import { FitClass } from "../tolerance";

export const MountType = z.enum(["screw", "pad"]);
export type MountType = z.infer<typeof MountType>;

/** Kabelclip – spiegelt app/templates/cable_clip.py:CableClipParams. */
export const CableClipParams = z.object({
  cable_d: z.number().gte(1.5).lte(25),
  channels: z.number().int().gte(1).lte(4).default(1),
  depth: z.number().gte(4).lte(40).default(10),
  wall: z.number().gte(1.6).lte(6).default(2),
  mount: MountType.default("screw"),
  screw_d: z.number().gte(2).lte(6).default(3.5),
  fit: FitClass.default("snug"),
});
export type CableClipParams = z.infer<typeof CableClipParams>;
