import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// Mirrors the in-app score-ring dial: track + partial arc + compass ticks.
const RING_SIZE = 400;
const CENTER = RING_SIZE / 2;
const RADIUS = 168;
const STROKE = 22;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const DASH = CIRCUMFERENCE * 0.74;

const TICK_ANGLES = [-90, 0, 90, 180];
const TICK_OUTER = RADIUS + STROKE / 2 + 12;
const TICK_INNER = TICK_OUTER - 16;

export default function Icon() {
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
          borderRadius: 112,
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
            {TICK_ANGLES.map((deg) => {
              const rad = (deg * Math.PI) / 180;
              const x1 = CENTER + TICK_OUTER * Math.cos(rad);
              const y1 = CENTER + TICK_OUTER * Math.sin(rad);
              const x2 = CENTER + TICK_INNER * Math.cos(rad);
              const y2 = CENTER + TICK_INNER * Math.sin(rad);
              return (
                <line
                  key={deg}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#f7f5f1"
                  strokeWidth={4}
                  strokeLinecap="round"
                  opacity={0.35}
                />
              );
            })}
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
              fontSize: 168,
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
