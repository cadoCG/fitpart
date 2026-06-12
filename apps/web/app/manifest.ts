import type { MetadataRoute } from "next";

// PWA-Manifest (Briefing 1: Web-App als PWA).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FitPart",
    short_name: "FitPart",
    description:
      "Passgenaue 3D-Druck-Funktionsteile aus Foto + geführter Messung.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbfbfc",
    theme_color: "#fbfbfc",
    icons: [
      {
        src: "/brand/fitpart-mark.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/brand/fitpart-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
