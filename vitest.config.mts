import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Integration tests spin up a real mongod (mongodb-memory-server) which
    // needs longer than the default 5s timeout on a cold binary cache.
    testTimeout: 30000,
    hookTimeout: 30000,
  },
})
