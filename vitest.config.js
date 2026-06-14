import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "#app.js": resolve(root, "src/app.js"),
      "#config": resolve(root, "src/config"),
      "#models": resolve(root, "src/models"),
      "#services": resolve(root, "src/services"),
      "#controllers": resolve(root, "src/controllers"),
      "#middlewares": resolve(root, "src/middlewares"),
      "#routes": resolve(root, "src/routes"),
      "#utils": resolve(root, "src/utils"),
      "#assets": resolve(root, "src/assets"),
      "#tests": resolve(root, "src/tests"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    // El pool de forks es más estable en Windows con suites que levantan
    // mongodb-memory-server (evita el error intermitente "failed to find the runner")
    pool: "forks",
    hookTimeout: 30000,
    env: {
      JWT_SECRET: "test-jwt-secret-key",
      JWT_REFRESH_SECRET: "test-jwt-refresh-secret-key",
      JWT_EXPIRES_IN: "15m",
      JWT_REFRESH_EXPIRES_IN: "7d",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "coverage",
      include: ["src/**/*.js"],
      exclude: ["src/tests/**", "src/assets/**", "src/config/**", "src/index.js"],
    },
  },
});
