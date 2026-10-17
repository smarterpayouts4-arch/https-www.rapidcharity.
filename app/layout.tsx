import type { Metadata } from "next";
import { Cormorant_Garamond, Plus_Jakarta_Sans, Poppins } from "next/font/google";
import { SiteShell } from "@/components/SiteShell";
import { loadSiteContent } from "@/lib/content";
import { site } from "@/lib/site";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-cormorant",
  preload: false,
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal"],
  display: "swap",
  variable: "--font-jakarta",
  preload: true,
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600"],
  display: "swap",
  variable: "--font-poppins",
  preload: false,
});

const description =
  "RAPID Charity: Reconciliation And Peace Innovative Development. Scholarships and educational empowerment.";

export const metadata: Metadata = {
  title: {
    default: `${site.name} | ${site.fullName}`,
    template: `%s | ${site.name}`,
  },
  description,
  metadataBase: new URL(site.url),
  applicationName: site.name,
  openGraph: {
    title: `${site.name} | ${site.fullName}`,
    description,
    url: site.url,
    siteName: site.name,
    type: "website",
    images: [
      {
        url: "/assets/images/generated/hero-graduation-handshake-landscape.jpg",
        width: 2000,
        height: 1250,
        alt: "Graduates shaking hands with diploma at commencement",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} | ${site.fullName}`,
    description,
    images: ["/assets/images/generated/hero-graduation-handshake-landscape.jpg"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const content = await loadSiteContent({ preview: false });

  return (
    <html lang="en" className={`${cormorant.variable} ${jakarta.variable} ${poppins.variable}`}>
      <body>
        <SiteShell nav={content.nav} footer={content.footer}>
          {children}
        </SiteShell>
      </body>
    </html>
  );
}
