import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Las fotos del catálogo vienen del CDN de Shopify (export de SAP/MercadoLibre).
    // Si en el futuro las marcas suben fotos desde otro dominio, agregarlo aquí.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
