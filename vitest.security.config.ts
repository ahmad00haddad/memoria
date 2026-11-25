import { defineConfig } from "vitest/config";

// Security regression suite. Separate from the normal unit tests on purpose:
//   npm run test:security     (needs SECURITY_TEST_* env vars pointing to the DEV Supabase project)
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/security/**/*.test.ts"],
    setupFiles: ["tests/security/setup.ts"],
    testTimeout: 30_000,
    fileParallelism: false,
  },
});
