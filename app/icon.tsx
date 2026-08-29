import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

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
          background: "#2563eb",
          borderRadius: 96,
          fontSize: 320,
          fontWeight: 700,
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        H
      </div>
    ),
    { ...size },
  );
}
