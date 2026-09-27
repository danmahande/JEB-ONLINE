import { ImageResponse } from "next/og";

/* The social card — same face paint as the shop: ink steel, milled white
   type, the brand-orange index square. Rendered once at request time and
   cached; every page that doesn't declare its own og image inherits it. */

export const alt = "MERIDIAN SUPPLY — Grains & Hardware. Cross-Border.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#1B2A4A",
          padding: 64,
          border: "2px solid #2E4066",
        }}
      >
        {/* top row — the wordmark plate */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 22,
              height: 22,
              backgroundColor: "#FF6B35",
              display: "flex",
            }}
          />
          <div
            style={{
              color: "#FFFFFF",
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: -2,
              display: "flex",
            }}
          >
            MERIDIAN SUPPLY
          </div>
        </div>

        {/* middle — the promise, milled large */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              color: "#FFFFFF",
              fontSize: 88,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -3,
              display: "flex",
            }}
          >
            GRAINS &amp; HARDWARE.
          </div>
          <div
            style={{
              color: "#FF6B35",
              fontSize: 88,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -3,
              display: "flex",
            }}
          >
            CROSS-BORDER.
          </div>
        </div>

        {/* bottom row — the origin line */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            color: "#8FA1C4",
            fontSize: 30,
            letterSpacing: 2,
          }}
        >
          <div style={{ display: "flex" }}>UGANDA ORIGIN — EAC &amp; WORLDWIDE EXPORT</div>
          <div style={{ display: "flex" }}>MERIDIAN SUPPLY CO.</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
