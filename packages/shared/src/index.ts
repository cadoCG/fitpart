import { z } from "zod";
import { ToleranceProfile } from "./tolerance";
import { SpacerParams } from "./archetypes/spacer";
import { WallHookParams } from "./archetypes/wall_hook";
import { LBracketParams } from "./archetypes/l_bracket";
import { PipeClipParams } from "./archetypes/pipe_clip";
import { CableClipParams } from "./archetypes/cable_clip";
import { DeviceHolderParams } from "./archetypes/device_holder";

export * from "./tolerance";
export * from "./calibration";
export * from "./archetypes/spacer";
export * from "./archetypes/wall_hook";
export * from "./archetypes/l_bracket";
export * from "./archetypes/pipe_clip";
export * from "./archetypes/cable_clip";
export * from "./archetypes/device_holder";
export * from "./ui";

/** Bekannte Archetypen → Zod-Param-Schema (muss mit der CAD-Registry übereinstimmen). */
export const ARCHETYPE_SCHEMAS = {
  spacer: SpacerParams,
  wall_hook: WallHookParams,
  l_bracket: LBracketParams,
  pipe_clip: PipeClipParams,
  cable_clip: CableClipParams,
  device_holder: DeviceHolderParams,
} as const;

export type Archetype = keyof typeof ARCHETYPE_SCHEMAS;
export const ARCHETYPES = Object.keys(ARCHETYPE_SCHEMAS) as Archetype[];

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
