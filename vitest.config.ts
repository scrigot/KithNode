import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    // Never scan git worktrees checked out under .claude/ — they hold stale
    // copies of the tree (and tests for branches not merged here), which break
    // the suite with phantom unresolved imports.
    exclude: [...configDefaults.exclude, ".claude/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Next replaces this marker at build time. Unit tests run outside Next,
      // so map it to a no-op while preserving the production server boundary.
      "server-only": path.resolve(__dirname, "./src/test/server-only.ts"),
    },
  },
});
