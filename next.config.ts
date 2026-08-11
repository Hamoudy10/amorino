import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Menu photos uploaded to Supabase Storage (public food-images bucket).
      { protocol: "https", hostname: "**.supabase.co" },
      // Local dev convenience.
      { protocol: "http", hostname: "localhost" },
    ],
  },
};

export default nextConfig;