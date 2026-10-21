import type { Metadata } from "next";
import { site } from "../site";

/**
 * Host used for metadataBase and absolute Open Graph URLs.
 * On Vercel, use the deployment host so og:image is fetchable before www.rapidcharity.org serves the Next app.
 */
export function resolveSiteOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  if (process.env.VERCEL === "1") {
    const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
    if (production) return `https://${production.replace(/^https?:\/\//, "")}`;
    const deployment = process.env.VERCEL_URL?.trim();
    if (deployment) return `https://${deployment.replace(/^https?:\/\//, "")}`;
  }

  return site.url;
}

/** Approved homepage / default social preview (served from `public/assets/images/og-image.png`). */
export const DEFAULT_OG_IMAGE = {
  path: "/assets/images/og-image.png",
  width: 1731,
  height: 909,
  alt: `${site.name}: ${site.fullName}. Scholarships and educational empowerment.`,
} as const;

export const SITE_DESCRIPTION =
  "RAPID Charity: Reconciliation And Peace Innovative Development. Scholarships and educational empowerment.";

const defaultTitle = `${site.name} | ${site.fullName}`;

/** Root layout metadata for public pages (Open Graph + Twitter). */
export function rootSiteMetadata(): Metadata {
  const origin = resolveSiteOrigin();
  return {
    title: {
      default: defaultTitle,
      template: `%s | ${site.name}`,
    },
    description: SITE_DESCRIPTION,
    metadataBase: new URL(origin),
    applicationName: site.name,
    alternates: {
      canonical: site.url,
    },
    openGraph: {
      title: defaultTitle,
      description: SITE_DESCRIPTION,
      url: origin,
      siteName: site.name,
      type: "website",
      images: [
        {
          url: DEFAULT_OG_IMAGE.path,
          width: DEFAULT_OG_IMAGE.width,
          height: DEFAULT_OG_IMAGE.height,
          alt: DEFAULT_OG_IMAGE.alt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: defaultTitle,
      description: SITE_DESCRIPTION,
      images: [DEFAULT_OG_IMAGE.path],
    },
  };
}
