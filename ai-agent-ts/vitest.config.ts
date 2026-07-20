import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // tools.ts throws at import time if these are unset (real values are only
    // needed for actual backend calls, which these unit tests never make).
    env: {
      BACKEND_URL: "http://localhost:0",
      INTERNAL_API_KEY: "test",
    },
  },
});
