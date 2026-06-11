import { z } from "zod";

/** L-Winkel – spiegelt app/templates/l_bracket.py:LBracketParams. */
export const LBracketParams = z
  .object({
    leg_a: z.number().gte(20).lte(300),
    leg_b: z.number().gte(20).lte(300),
    width: z.number().gte(10).lte(150),
    thickness: z.number().gte(2.4).lte(15).default(4),
    rib: z.boolean().default(true),
    screw_d: z.number().gte(2).lte(10).default(4),
    holes_per_leg: z.number().int().gte(1).lte(3).default(2),
  })
  .refine(
    (p) => {
      const need = p.holes_per_leg * 4 * p.screw_d;
      return p.leg_a - p.thickness >= need && p.leg_b - p.thickness >= need;
    },
    { message: "Schenkel zu kurz für das Lochbild.", path: ["holes_per_leg"] },
  );
export type LBracketParams = z.infer<typeof LBracketParams>;
