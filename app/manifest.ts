import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Health Tracker",
    short_name: "Health",
    description: "Personal health and recovery tracker, backed by Google Health data.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f5f1",
    theme_color: "#1c1b19",
    icons: [{ src: "/icon", sizes: "512x512", type: "image/png" }],
  };
}
