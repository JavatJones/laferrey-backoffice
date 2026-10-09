import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Imágenes de productos servidas por el CDN de Shopify.
    remotePatterns: [{ protocol: "https", hostname: "cdn.shopify.com", pathname: "/s/files/**" }],
  },
};

export default nextConfig;
