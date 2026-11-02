import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  esbuild: { jsx: "automatic" },
  // Run the suite on a zone far from UTC (and with daylight saving), so any date maths
  // that leaks through the server's own time zone fails here, not in riders' plans.
  test: { env: { TZ: "Australia/Sydney" }, include: process.env.INSPECT ? ["scripts/**/*.test.ts"] : ["src/**/*.test.ts", "src/**/*.test.tsx"] },
});
