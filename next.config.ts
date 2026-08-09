import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Silence the Turbopack/webpack config conflict warning
  turbopack: {},
};

export default nextConfig;
