import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { fileParallelism: false, include: ["src/**/*.test.{ts,tsx}"], environment: "node", setupFiles: ["./vitest.setup.ts"], testTimeout: 20000 },
});
