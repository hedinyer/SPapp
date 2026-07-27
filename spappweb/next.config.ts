import type { NextConfig } from "next";

const allowedDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
  reactCompiler: true,
  serverExternalPackages: ["sharp"],
  experimental: {
    serverActions: {
      // Fotos de cámara móvil pueden superar 1 MB (límite por defecto de Next.js)
      bodySizeLimit: "15mb",
    },
    // Soft-nav: reutilizar RSC reciente en el cliente (default dynamic=0 = siempre round-trip)
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
