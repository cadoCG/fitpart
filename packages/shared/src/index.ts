import { z } from "zod";
import { ToleranceProfile } from "./tolerance";
import { ArchetypeEnum } from "./analyze";
import { SpacerParams } from "./archetypes/spacer";
import { WallHookParams } from "./archetypes/wall_hook";
import { LBracketParams } from "./archetypes/l_bracket";
import { PipeClipParams } from "./archetypes/pipe_clip";
import { CableClipParams } from "./archetypes/cable_clip";
import { DeviceHolderParams } from "./archetypes/device_holder";
import { KnobParams } from "./archetypes/knob";
import { AdapterRingParams } from "./archetypes/adapter_ring";
import { FurnitureGlideParams } from "./archetypes/furniture_glide";
import { SnapLidParams } from "./archetypes/snap_lid";
import { HingeParams } from "./archetypes/hinge";
import { EndCapParams } from "./archetypes/end_cap";
import { DrawerHandleParams } from "./archetypes/drawer_handle";
import { SpringClipParams } from "./archetypes/spring_clip";

export * from "./tolerance";
export * from "./calibration";
export * from "./analyze";
export * from "./part_request";
export * from "./dimensions";
export * from "./feedback";
export * from "./archetypes/spacer";
export * from "./archetypes/wall_hook";
export * from "./archetypes/l_bracket";
export * from "./archetypes/pipe_clip";
export * from "./archetypes/cable_clip";
export * from "./archetypes/device_holder";
export * from "./archetypes/knob";
export * from "./archetypes/adapter_ring";
export * from "./archetypes/furniture_glide";
export * from "./archetypes/snap_lid";
export * from "./archetypes/hinge";
export * from "./archetypes/end_cap";
export * from "./archetypes/drawer_handle";
export * from "./archetypes/spring_clip";
export * from "./ui";

/** Bekannte Archetypen → Zod-Param-Schema (muss mit der CAD-Registry übereinstimmen). */
export const ARCHETYPE_SCHEMAS = {
  spacer: SpacerParams,
  wall_hook: WallHookParams,
  l_bracket: LBracketParams,
  pipe_clip: PipeClipParams,
  cable_clip: CableClipParams,
  device_holder: DeviceHolderParams,
  knob: KnobParams,
  adapter_ring: AdapterRingParams,
  furniture_glide: FurnitureGlideParams,
  snap_lid: SnapLidParams,
  hinge: HingeParams,
  end_cap: EndCapParams,
  drawer_handle: DrawerHandleParams,
  spring_clip: SpringClipParams,
} as const;

export type Archetype = keyof typeof ARCHETYPE_SCHEMAS;
export const ARCHETYPES = Object.keys(ARCHETYPE_SCHEMAS) as Archetype[];

/**
 * Kritische Masse pro Archetyp – die der User am vorhandenen (defekten) Teil
 * mit dem Messschieber abmisst, statt sie aus dem Foto zu schätzen. Der
 * MeasureWizard fragt sie Schritt für Schritt ab; Fokus liegt auf den
 * formgebenden Massen des Teils selbst (Breite, Länge, Bohrung), nicht auf
 * abstrakten Bedarfsangaben. Restliche Masse: Default + Slider-Korrektur.
 * `satisfies` erzwingt, dass jeder Archetyp abgedeckt ist; der Re-Export von
 * ArchetypeEnum aus analyze.ts wird darüber implizit mitgeprüft.
 *
 * Nur Slider-/Int-Parameter aufnehmen (der Wizard rendert ein Zahlenfeld) –
 * keine boolean/select/fit-Felder. Kreuz-Constraints der Zod-Modelle beachten:
 * abhängige Masse (z. B. wall_hook.back_height) bleiben Default, um
 * Validierungsfehler bei Extremwerten zu vermeiden.
 */
export const CRITICAL_DIMS = {
  spacer: ["inner_d", "outer_d", "height"],
  wall_hook: ["hook_depth", "width", "screw_d"],
  l_bracket: ["leg_a", "leg_b", "width", "screw_d"],
  pipe_clip: ["pipe_d", "width"],
  cable_clip: ["cable_d", "channels"],
  device_holder: ["device_w", "device_d"],
  knob: ["shaft_d", "d_flat", "knob_d"],
  adapter_ring: ["outer_d", "inner_d", "height"],
  furniture_glide: ["leg_w", "height"],
  snap_lid: ["rim_d"],
  hinge: ["length", "pin_d"],
  end_cap: ["outer_w"],
  drawer_handle: ["hole_spacing"],
  spring_clip: ["grip_d"],
} as const satisfies Record<Archetype, readonly string[]>;

// Compile-Check: ArchetypeEnum (analyze.ts) und Registry decken sich.
const _archetypeEnumCheck: readonly Archetype[] = ArchetypeEnum.options;
const _registryCheck: readonly z.infer<typeof ArchetypeEnum>[] = ARCHETYPES;
void _archetypeEnumCheck;
void _registryCheck;

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
