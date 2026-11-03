import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

/**
 * Builds the HACS-compatible browser module with a deterministic asset name.
 */
export default defineConfig({
  build: {
    target: "es2022",
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    lib: {
      entry: resolve(fileURLToPath(new URL(".", import.meta.url)), "src/index.ts"),
      formats: ["es"],
      fileName: () => "h2dc-dashboard.js",
    },
  },
});
