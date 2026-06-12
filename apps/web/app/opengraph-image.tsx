import { ImageResponse } from "next/og";
import { MARK_ORANGE, MARK_INK, BRAND } from "@/lib/brand";

export const alt = "FitPart — passgenaue 3D-Druck-Teile aus Foto + Messung";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: BRAND.page,
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          padding: 64,
        }}
      >
        <svg width="280" height="224" viewBox="0 0 150 120" fill="none">
          <path d={MARK_ORANGE} stroke={BRAND.orange} strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" />
          <path d={MARK_INK} stroke={BRAND.page} strokeWidth={18} strokeLinejoin="round" strokeLinecap="round" />
          <path d={MARK_INK} stroke={BRAND.ink} strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" />
        </svg>
        <div style={{ display: "flex", fontSize: 110, fontWeight: 800, letterSpacing: "-0.03em" }}>
          <span style={{ color: BRAND.orange }}>Fit</span>
          <span style={{ color: BRAND.ink }}>Part</span>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 38,
            color: BRAND.textSecondary,
            textAlign: "center",
            maxWidth: 820,
          }}
        >
          Defektes Teil? Drucke das passende.
        </div>
      </div>
    ),
    { ...size },
  );
}
