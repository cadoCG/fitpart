import { z } from "zod";
import { ToleranceProfile } from "./tolerance";
import { SpacerParams } from "./archetypes/spacer";

export * from "./tolerance";
export * from "./archetypes/spacer";

/** Bekannte Archetypen → Zod-Param-Schema (muss mit der CAD-Registry übereinstimmen). */
export const ARCHETYPE_SCHEMAS = {
  spacer: SpacerParams,
} as const;

export type Archetype = keyof typeof ARCHETYPE_SCHEMAS;

export const ExportFormat = z.enum(["stl", "3mf", "step"]);
export type ExportFormat = z.infer<typeof ExportFormat>;

/** Request-Body für POST /generate des CAD-Service. */
export const GenerateRequest = z.object({
  archetype: z.string(),
  params: z.record(z.unknown()),
  tolerance_profile: ToleranceProfile.optional(),
  format: ExportFormat.default("stl"),
});
export type GenerateRequest = z.infer<typeof GenerateRequest>;
