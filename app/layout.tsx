import type { Metadata } from "next";
import { Cormorant_Garamond, Plus_Jakarta_Sans, Poppins } from "next/font/google";
import { SiteShell } from "@/components/SiteShell";
import { loadSiteContent } from "@/lib/content";
import { activeAnnouncement } from "@/lib/content/announcement";
import { rootSiteMetadata } from "@/lib/site/shareMetadata";
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

export const metadata: Metadata = rootSiteMetadata();

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const content = await loadSiteContent({ preview: false });

  return (
    <html lang="en" className={`${cormorant.variable} ${jakarta.variable} ${poppins.variable}`}>
      <body>
        <SiteShell
          nav={content.nav}
          footer={content.footer}
          announcement={activeAnnouncement(content.announcement, content.intakes?.timezone)}
          programBlurbs={Object.fromEntries(
            (content.scholarshipPrograms?.programs ?? []).map((p) => [p.href, p.blurb]),
          )}
        >
          {children}
        </SiteShell>
      </body>
    </html>
  );
}
