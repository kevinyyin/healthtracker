import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { environment: "node" },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // Next.js resolves "server-only" to its no-op build via the "react-server"
      // export condition; plain Node/Vitest doesn't set that condition, so it'd
      // otherwise always throw. Point straight at the package's own no-op file.
      "server-only": path.resolve(__dirname, "node_modules/server-only/empty.js"),
    },
  },
});
