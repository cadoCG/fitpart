import type { MetadataRoute } from "next";

// PWA-Manifest (Briefing 1: Web-App als PWA). Icons folgen mit dem Branding.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FitPart",
    short_name: "FitPart",
    description:
      "Passgenaue 3D-Druck-Funktionsteile aus Foto + geführter Messung.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#18181b",
    icons: [],
  };
}
