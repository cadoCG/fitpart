import { z } from "zod";
import { FitClass } from "../tolerance";

/** Adapterring/Reduzierhülse – spiegelt app/templates/adapter_ring.py:AdapterRingParams. */
export const AdapterRingParams = z
  .object({
    outer_d: z.number().gte(6).lte(120),
    inner_d: z.number().gte(2).lte(110),
    height: z.number().gte(5).lte(120).default(20),
    collar: z.boolean().default(false),
    fit_outer: FitClass.default("snug"),
    fit_inner: FitClass.default("snug"),
  })
  .refine((p) => p.outer_d - p.inner_d >= 4, {
    message: "outer_d muss ≥ inner_d + 4 sein – Ringwand zu dünn.",
    path: ["outer_d"],
  });
export type AdapterRingParams = z.infer<typeof AdapterRingParams>;
