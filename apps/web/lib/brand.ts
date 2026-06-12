/**
 * Geteilte Markengeometrie + Farben (Single Source of Truth).
 * Genutzt von der Logo-Komponente und den next/og-Icon-/OG-Routen.
 * Zwei ineinandergreifende Kreuz-Formen («es passt»), viewBox 0 0 150 120.
 */
export const MARK_ORANGE =
  "M35 24 H65 V45 H86 V75 H65 V96 H35 V75 H14 V45 H35 Z";
export const MARK_INK =
  "M85 24 H115 V45 H136 V75 H115 V96 H85 V75 H64 V45 H85 Z";

export const BRAND = {
  orange: "#df5c0c",
  orangeDark: "#e87a28",
  ink: "#15171c",
  inkDark: "#f2f3f5",
  page: "#fbfbfc",
  pageDark: "#0c0d10",
  textSecondary: "#5b606b",
} as const;
