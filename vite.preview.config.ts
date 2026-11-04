import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

/**
 * Builds a standalone preview artifact that cannot share a runtime chunk with
 * the HACS production bundle.
 */
export default defineConfig({
  build: {
    target: "es2022",
    outDir: "dist",
    emptyOutDir: false,
    sourcemap: false,
    lib: {
      entry: resolve(fileURLToPath(new URL(".", import.meta.url)), "src/preview-entry.ts"),
      formats: ["es"],
      fileName: () => "h2dc-dashboard-preview.js",
    },
  },
});
