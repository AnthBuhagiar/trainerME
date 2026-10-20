import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Codespaces serves the dev server from https://<name>-3000.app.github.dev.
  allowedDevOrigins: ["*.app.github.dev"],
};

export default nextConfig;
