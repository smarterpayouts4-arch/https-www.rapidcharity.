"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { RevealController } from "@/components/motion/RevealController";
import type { ActiveAnnouncement } from "@/lib/content/announcement";
import type { SiteContent } from "@/lib/content/schema";

type Props = {
  children: React.ReactNode;
  nav: SiteContent["nav"];
  footer: SiteContent["footer"];
  programBlurbs?: Record<string, string>;
  announcement?: ActiveAnnouncement | null;
};

/**
 * Site chrome for public pages. Admin routes render children only
 * (Keystatic/Makerkit pattern: dedicated admin shell).
 */
export function SiteShell({ children, nav, footer, programBlurbs, announcement }: Props) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {announcement ? <AnnouncementBanner announcement={announcement} /> : null}
      <Header nav={nav} programBlurbs={programBlurbs} />
      <main id="main" className="site-main">{children}</main>
      <RevealController />
      <Footer
        footer={footer}
        brandName={nav.brandName}
        brandTag={nav.brandTag}
      />
    </>
  );
}
