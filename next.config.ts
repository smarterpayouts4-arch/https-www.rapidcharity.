import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
  // The sample-document route reads these at runtime (sample mode, see docs/mock-applications.md).
  outputFileTracingIncludes: {
    "/api/dev/sample-documents": ["./tests/fixtures/sample-documents/*-sample.{jpg,png,pdf}"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    proxyClientMaxBodySize: "8mb",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
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
