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
          background: "#1c1b19",
          borderRadius: 112,
          fontSize: 320,
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
