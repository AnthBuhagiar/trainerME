import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // A self-contained server (node server.js) for small hosts: built by GitHub Actions, run without npm.
  // File tracing copies a local data/ folder into .next/standalone; scripts/package-release.sh strips it
  // (an outputFileTracingExcludes glob for data/ also drops next's own lib/metadata files).
  output: "standalone",
  // Codespaces serves the dev server from https://<name>-3000.app.github.dev.
  allowedDevOrigins: ["*.app.github.dev"],
};

export default nextConfig;
