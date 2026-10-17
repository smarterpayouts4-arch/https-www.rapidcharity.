"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import type { SiteContent } from "@/lib/content/schema";

type Props = {
  children: React.ReactNode;
  nav: SiteContent["nav"];
  footer: SiteContent["footer"];
  programBlurbs?: Record<string, string>;
};

/**
 * Site chrome for public pages. Admin routes render children only
 * (Keystatic/Makerkit pattern: dedicated admin shell).
 */
export function SiteShell({ children, nav, footer, programBlurbs }: Props) {
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
      <Header nav={nav} programBlurbs={programBlurbs} />
      <main id="main" className="site-main">{children}</main>
      <Footer
        footer={footer}
        brandName={nav.brandName}
        brandTag={nav.brandTag}
      />
    </>
  );
}
