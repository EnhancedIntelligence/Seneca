import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Strict in CI, relaxed locally
    ignoreDuringBuilds: process.env.CI ? false : true,
  },
};

export default nextConfig;
