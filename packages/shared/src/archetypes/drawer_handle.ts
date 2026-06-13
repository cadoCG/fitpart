import { z } from "zod";

/** Schubladengriff – spiegelt app/templates/drawer_handle.py:DrawerHandleParams. */
export const DrawerHandleParams = z
  .object({
    hole_spacing: z.number().gte(32).lte(256),
    grip_d: z.number().gte(8).lte(30).default(12),
    height: z.number().gte(18).lte(70).default(30),
    overhang: z.number().gte(0).lte(60).default(15),
    screw_d: z.number().gte(3).lte(6).default(4),
  })
  .refine((p) => p.grip_d >= p.screw_d + 3.2, {
    message: "grip_d zu dünn für das Schraubloch (mind. screw_d + 3,2 mm).",
    path: ["grip_d"],
  });
export type DrawerHandleParams = z.infer<typeof DrawerHandleParams>;
