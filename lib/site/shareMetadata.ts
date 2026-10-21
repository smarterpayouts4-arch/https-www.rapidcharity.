import type { Metadata } from "next";
import { site } from "../site";

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
  return {
    title: {
      default: defaultTitle,
      template: `%s | ${site.name}`,
    },
    description: SITE_DESCRIPTION,
    metadataBase: new URL(site.url),
    applicationName: site.name,
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title: defaultTitle,
      description: SITE_DESCRIPTION,
      url: site.url,
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
