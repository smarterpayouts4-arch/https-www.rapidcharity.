import type { Metadata } from "next";
import { Cormorant_Garamond } from "next/font/google";
import { SiteShell } from "@/components/SiteShell";
import { loadSiteContent } from "@/lib/content";
import { site } from "@/lib/site";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-cormorant",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: `${site.name} | ${site.fullName}`,
    template: `%s | ${site.name}`,
  },
  description:
    "RAPID Charity: Reconciliation And Peace Innovative Development. Scholarships and educational empowerment.",
  metadataBase: new URL(site.url),
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const content = await loadSiteContent({ preview: false });

  return (
    <html lang="en" className={cormorant.variable}>
      <body>
        <SiteShell nav={content.nav} footer={content.footer}>
          {children}
        </SiteShell>
      </body>
    </html>
  );
}
