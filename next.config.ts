import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ESLint no build está desativado temporariamente (deps de lint instáveis no Windows).
  // Use `npm run lint` separado quando precisar.
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "http2.mlstatic.com" },
      { protocol: "https", hostname: "images.unsplash.com" }
    ]
  }
};

export default nextConfig;