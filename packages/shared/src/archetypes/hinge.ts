import { z } from "zod";
import { FitClass } from "../tolerance";

// Bewegungsspalt (mirror von hinge.py).
const CL_RAD = 0.5;
const CL_AX = 0.4;

/** Scharnier (Filament-Pin) – spiegelt app/templates/hinge.py:HingeParams. */
export const HingeParams = z
  .object({
    length: z.number().gte(20).lte(200),
    leaf_w: z.number().gte(8).lte(80).default(15),
    thickness: z.number().gte(1.6).lte(6).default(2.5),
    pin_d: z.number().gte(2).lte(8),
    knuckles: z.number().int().gte(3).lte(9).default(5),
    screw_d: z.number().gte(2).lte(6).default(3),
    fit: FitClass.default("sliding"),
  })
  .refine((p) => p.knuckles % 2 === 1, {
    message: "knuckles muss ungerade sein.",
    path: ["knuckles"],
  })
  .refine((p) => p.length / p.knuckles - CL_AX >= p.thickness, {
    message: "Zu viele Knöchel für die Länge (Segment < Blattdicke).",
    path: ["knuckles"],
  })
  .refine((p) => p.leaf_w > CL_RAD + 2 * p.screw_d, {
    message: "leaf_w zu schmal für Schraubloch + Bewegungsspalt.",
    path: ["leaf_w"],
  });
export type HingeParams = z.infer<typeof HingeParams>;
