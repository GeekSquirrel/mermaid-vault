import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Isolated throwaway SQLite database per test file (see src/tests/db-setup.ts)
    setupFiles: ["./src/tests/db-setup.ts"],
  },
});
