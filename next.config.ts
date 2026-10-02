import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ESLint no build está desativado temporariamente (deps de lint instáveis no Windows).
  // Use `npm run lint` separado quando precisar.
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "http2.mlstatic.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      // V4 marketplaces (só exibição; semHOTLINK de afiliado não-oficial)
      { protocol: "https", hostname: "cf.shopee.com.br" },
      { protocol: "https", hostname: "down-br.img.susercontent.com" }
    ]
  }
};

export default nextConfig;