import { ImageResponse } from "next/og";
import { MARK_ORANGE, MARK_INK, BRAND } from "@/lib/brand";

// Apple-Touch-Icon: voll gefülltes Quadrat (iOS rundet selbst), Mark zentriert.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: BRAND.page,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="150" height="120" viewBox="0 0 150 120" fill="none">
          <path
            d={MARK_ORANGE}
            stroke={BRAND.orange}
            strokeWidth={9}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d={MARK_INK}
            stroke={BRAND.page}
            strokeWidth={18}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d={MARK_INK}
            stroke={BRAND.ink}
            strokeWidth={9}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
