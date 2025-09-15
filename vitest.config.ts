import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.ts", "test/**/*.spec.ts"],
    exclude: ["node_modules", ".next", "e2e"],
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "test/",
        ".next/",
        "*.config.ts",
        "*.config.js",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      // Mock server-only module for tests
      // NOTE: This alias is for tests only. Do not import "server-only" from client modules in app code.
      "server-only": path.resolve(__dirname, "./test/__mocks__/server-only.ts"),
    },
  },
});
