import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

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
          fontSize: 112,
          fontWeight: 500,
          color: "#f7f5f1",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        H
      </div>
    ),
    { ...size },
  );
}
