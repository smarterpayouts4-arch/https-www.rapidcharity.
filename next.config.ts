import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    proxyClientMaxBodySize: "8mb",
  },
  async redirects() {
    return [
      { source: "/form", destination: "/apply", permanent: true },
      { source: "/scholarship-form", destination: "/apply", permanent: true },
      { source: "/prequlificationform-first-name", destination: "/apply", permanent: true },
      { source: "/copy-of-apply-1", destination: "/general-8", permanent: true },
      { source: "/copy-of-john-ivy-form", destination: "/robert-mathais-scholarship", permanent: true },
      { source: "/announcements", destination: "/blog", permanent: true },
      { source: "/do-not-use", destination: "/apply", permanent: true },
      { source: "/donation-thank-you-page", destination: "/donate", permanent: true },
      { source: "/profile", destination: "/blog", permanent: true },
      { source: "/profile/:path*", destination: "/blog", permanent: true },
    ];
  },
};

export default nextConfig;
