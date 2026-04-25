import { defineConfig } from "vitest/config";

/** HTTP integration tests only (`createApp` + Supertest). See `package.json` → `test:integration`. */
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/api/**/*.test.ts"],
    setupFiles: ["test/setup-env.ts"],
    testTimeout: 60_000,
    hookTimeout: 60_000
  }
});
