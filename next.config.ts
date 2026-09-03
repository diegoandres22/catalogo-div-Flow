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
    // Sin optimización server-side: con ~1.600+ productos, cada foto pasando
    // por el optimizador de imágenes de Vercel agota la cuota gratuita del
    // plan y las imágenes empiezan a devolver 402 (Payment Required). Las
    // fotos ya vienen servidas por el CDN de Shopify, así que no hace falta
    // re-optimizarlas del lado de Vercel — se sirven tal cual, gratis.
    unoptimized: true,
  },
};

export default nextConfig;
