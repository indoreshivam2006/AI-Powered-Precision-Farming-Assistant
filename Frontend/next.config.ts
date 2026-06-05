import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // In production (Vercel), these env vars point to your Render services.
    // Locally, they default to localhost.
    const diseaseBackend =
      process.env.NEXT_PUBLIC_DISEASE_API_URL || "http://localhost:8000";
    const cropBackend =
      process.env.NEXT_PUBLIC_CROP_API_URL || "http://localhost:8001";

    return [
      {
        source: "/api/backend/disease/:path*",
        destination: `${diseaseBackend}/:path*`,
      },
      {
        source: "/api/backend/crop/:path*",
        destination: `${cropBackend}/:path*`,
      },
    ];
  },
};

export default nextConfig;
