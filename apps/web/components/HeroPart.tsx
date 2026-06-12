"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const StlViewer = dynamic(() => import("@/components/StlViewer"), { ssr: false });

/**
 * Landing-Hero-Visual: lädt best-effort ein Wandhaken-Teil vom CAD-Service und
 * zeigt es im Studio. Ist der Service nicht erreichbar, bleibt das Raster leer
 * (kein blockierender Fehler auf der Landing).
 */
export default function HeroPart() {
  const [stl, setStl] = useState<ArrayBuffer | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/cad/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        archetype: "wall_hook",
        params: { hook_depth: 20, width: 20, thickness: 4, back_height: 60 },
        format: "stl",
      }),
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .then((buf) => buf && setStl(buf))
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  if (!stl) return null;
  return <StlViewer stl={stl} />;
}
