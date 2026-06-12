import { z } from "zod";
import { FitClass } from "../tolerance";

/** Drehknopf (D-Welle) – spiegelt app/templates/knob.py:KnobParams. */
export const KnobParams = z
  .object({
    shaft_d: z.number().gte(2).lte(20),
    d_flat: z.number().gte(1).lte(20),
    knob_d: z.number().gte(10).lte(80),
    height: z.number().gte(8).lte(50).default(15),
    ribs: z.number().int().gte(0).lte(36).default(12),
    fit: FitClass.default("snug"),
  })
  .refine((p) => p.d_flat >= 0.5 * p.shaft_d && p.d_flat <= p.shaft_d, {
    message: "d_flat muss zwischen 0,5×shaft_d und shaft_d liegen.",
    path: ["d_flat"],
  })
  .refine(
    (p) => {
      // Exakt wie knob.py:_rib_radius – Restwand 2,4 mm hinter dem Rillengrund.
      const ribR =
        p.ribs > 0 ? Math.min(2, (0.35 * Math.PI * p.knob_d) / p.ribs) : 0;
      return (p.knob_d - p.shaft_d) / 2 - ribR >= 2.4;
    },
    {
      message: "knob_d zu klein für shaft_d – Restwand zu dünn.",
      path: ["knob_d"],
    },
  );
export type KnobParams = z.infer<typeof KnobParams>;
