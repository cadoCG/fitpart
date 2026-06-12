/**
 * UI-Metadaten pro Archetyp: Feldtypen, Slider-Ranges, Defaults.
 * Labels kommen aus den next-intl-Messages (`Create.params.<key>`).
 */

export type FieldMeta =
  | { key: string; kind: "slider"; min: number; max: number; step?: number }
  | { key: string; kind: "int"; min: number; max: number }
  | { key: string; kind: "boolean" }
  | { key: string; kind: "fit" }
  | { key: string; kind: "select"; options: readonly string[] };

export type ArchetypeUi = {
  fields: FieldMeta[];
  defaults: Record<string, number | string | boolean>;
};

// Hinweis: Die 3D-Bemassung (Phase 2) kommt als semantische Anker vom
// CAD-Service (POST /dimensions, siehe ./dimensions.ts) – die frühere
// Bounding-Box-Registry VIEWER_DIMS wurde dadurch abgelöst.

export const ARCHETYPE_UI: Record<string, ArchetypeUi> = {
  spacer: {
    fields: [
      { key: "inner_d", kind: "slider", min: 2, max: 50 },
      { key: "outer_d", kind: "slider", min: 4, max: 80 },
      { key: "height", kind: "slider", min: 1, max: 100 },
      { key: "fit", kind: "fit" },
    ],
    defaults: { inner_d: 5, outer_d: 10, height: 8, fit: "sliding" },
  },
  wall_hook: {
    fields: [
      { key: "hook_depth", kind: "slider", min: 3, max: 80 },
      { key: "width", kind: "slider", min: 8, max: 100 },
      { key: "thickness", kind: "slider", min: 2.4, max: 12 },
      { key: "back_height", kind: "slider", min: 20, max: 200 },
      { key: "lip_height", kind: "slider", min: 4, max: 80 },
      { key: "screw_d", kind: "slider", min: 2, max: 8, step: 0.5 },
      { key: "countersink", kind: "boolean" },
      { key: "fit", kind: "fit" },
    ],
    defaults: {
      hook_depth: 8, width: 20, thickness: 4, back_height: 50,
      lip_height: 12, screw_d: 4, countersink: true, fit: "sliding",
    },
  },
  l_bracket: {
    fields: [
      { key: "leg_a", kind: "slider", min: 20, max: 300 },
      { key: "leg_b", kind: "slider", min: 20, max: 300 },
      { key: "width", kind: "slider", min: 10, max: 150 },
      { key: "thickness", kind: "slider", min: 2.4, max: 15 },
      { key: "rib", kind: "boolean" },
      { key: "screw_d", kind: "slider", min: 2, max: 10, step: 0.5 },
      { key: "holes_per_leg", kind: "int", min: 1, max: 3 },
    ],
    defaults: {
      leg_a: 60, leg_b: 60, width: 25, thickness: 4,
      rib: true, screw_d: 4, holes_per_leg: 2,
    },
  },
  pipe_clip: {
    fields: [
      { key: "pipe_d", kind: "slider", min: 3, max: 120 },
      { key: "width", kind: "slider", min: 5, max: 100 },
      { key: "wall", kind: "slider", min: 1.6, max: 10 },
      { key: "opening_ratio", kind: "slider", min: 0.4, max: 0.95, step: 0.01 },
      { key: "screw_d", kind: "slider", min: 2, max: 8, step: 0.5 },
      { key: "fit", kind: "fit" },
    ],
    defaults: {
      pipe_d: 20, width: 10, wall: 2.4, opening_ratio: 0.72,
      screw_d: 4, fit: "snug",
    },
  },
  cable_clip: {
    fields: [
      { key: "cable_d", kind: "slider", min: 1.5, max: 25 },
      { key: "channels", kind: "int", min: 1, max: 4 },
      { key: "depth", kind: "slider", min: 4, max: 40 },
      { key: "wall", kind: "slider", min: 1.6, max: 6 },
      { key: "mount", kind: "select", options: ["screw", "pad"] },
      { key: "screw_d", kind: "slider", min: 2, max: 6, step: 0.5 },
      { key: "fit", kind: "fit" },
    ],
    defaults: {
      cable_d: 6, channels: 2, depth: 10, wall: 2,
      mount: "screw", screw_d: 3.5, fit: "snug",
    },
  },
  device_holder: {
    fields: [
      { key: "device_w", kind: "slider", min: 10, max: 300 },
      { key: "device_d", kind: "slider", min: 3, max: 120 },
      { key: "lip_height", kind: "slider", min: 4, max: 80 },
      { key: "back_height", kind: "slider", min: 10, max: 200 },
      { key: "wall", kind: "slider", min: 2, max: 8 },
      { key: "wall_mount", kind: "boolean" },
      { key: "screw_d", kind: "slider", min: 2, max: 8, step: 0.5 },
      { key: "fit", kind: "fit" },
    ],
    defaults: {
      device_w: 70, device_d: 12, lip_height: 12, back_height: 30,
      wall: 3, wall_mount: true, screw_d: 4, fit: "sliding",
    },
  },
  knob: {
    fields: [
      { key: "shaft_d", kind: "slider", min: 2, max: 20 },
      { key: "d_flat", kind: "slider", min: 1, max: 20 },
      { key: "knob_d", kind: "slider", min: 10, max: 80 },
      { key: "height", kind: "slider", min: 8, max: 50 },
      { key: "ribs", kind: "int", min: 0, max: 36 },
      { key: "fit", kind: "fit" },
    ],
    defaults: {
      shaft_d: 6, d_flat: 4.5, knob_d: 25, height: 15, ribs: 12, fit: "snug",
    },
  },
  adapter_ring: {
    fields: [
      { key: "outer_d", kind: "slider", min: 6, max: 120 },
      { key: "inner_d", kind: "slider", min: 2, max: 110 },
      { key: "height", kind: "slider", min: 5, max: 120 },
      { key: "collar", kind: "boolean" },
      { key: "fit_outer", kind: "fit" },
      { key: "fit_inner", kind: "fit" },
    ],
    defaults: {
      outer_d: 32, inner_d: 25, height: 20, collar: false,
      fit_outer: "snug", fit_inner: "snug",
    },
  },
};
