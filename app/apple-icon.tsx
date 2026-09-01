import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Same dial motif as icon.tsx, simplified (no ticks) so it still reads at
// the smaller size iOS actually renders this at on a home screen.
const RING_SIZE = 140;
const CENTER = RING_SIZE / 2;
const RADIUS = 58;
const STROKE = 11;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const DASH = CIRCUMFERENCE * 0.74;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1c1b19",
        }}
      >
        <div style={{ position: "relative", width: RING_SIZE, height: RING_SIZE, display: "flex" }}>
          <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
            <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="rgba(247,245,241,0.14)" strokeWidth={STROKE} />
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke="#a9834f"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${DASH} ${CIRCUMFERENCE}`}
              transform={`rotate(-90 ${CENTER} ${CENTER})`}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: RING_SIZE,
              height: RING_SIZE,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 64,
              fontWeight: 600,
              color: "#f7f5f1",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            H
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
