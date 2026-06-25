import { defineConfig } from "vitest/config";
import { typescriptTranspilePlugin } from "./vite.config.ts";

export default defineConfig({
  esbuild: false,
  optimizeDeps: {
    include: [],
    noDiscovery: true,
  },
  plugins: [typescriptTranspilePlugin(true)],
  resolve: {
    preserveSymlinks: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    pool: "threads",
  },
});
