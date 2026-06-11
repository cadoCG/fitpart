import { z } from "zod";
import { FitClass } from "../tolerance";

/** Gerätehalterung – spiegelt app/templates/device_holder.py:DeviceHolderParams. */
export const DeviceHolderParams = z
  .object({
    device_w: z.number().gte(10).lte(300),
    device_d: z.number().gte(3).lte(120),
    lip_height: z.number().gte(4).lte(80).default(12),
    back_height: z.number().gte(10).lte(200).default(30),
    wall: z.number().gte(2).lte(8).default(3),
    wall_mount: z.boolean().default(true),
    screw_d: z.number().gte(2).lte(8).default(4),
    fit: FitClass.default("sliding"),
  })
  .refine((p) => !p.wall_mount || p.back_height >= 4 * p.screw_d, {
    message: "back_height muss ≥ 4×screw_d sein (Wandmontage).",
    path: ["back_height"],
  });
export type DeviceHolderParams = z.infer<typeof DeviceHolderParams>;
