"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { SiteContent } from "@/lib/content/schema";
import styles from "./Header.module.css";

function isActive(pathname: string, href?: string, children?: { href: string }[]) {
  if (href) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  if (children?.length) {
    return children.some((c) => pathname === c.href || pathname.startsWith(`${c.href}/`));
  }
  return false;
}

type Props = { nav: SiteContent["nav"] };

export function Header({ nav }: Props) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname() || "/";
  const close = () => setOpen(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const mainNav = nav.items.filter(
    (item) => item.label !== nav.donateCta.label && item.href !== nav.donateCta.href,
  );
  const donateItem = { label: nav.donateCta.label, href: nav.donateCta.href };
  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ""}`}>
      <div className={`container ${styles.bar}`}>
        <Link href="/" className={styles.brand} aria-label={nav.homeAriaLabel} onClick={close}>
          <Image
            src={nav.logo.src}
            alt={nav.logo.alt}
            width={79}
            height={46}
            priority
            style={{ width: "auto", height: "auto" }}
          />
          <span className={styles.brandText}>
            <span className={styles.brandName}>{nav.brandName}</span>
            <span className={styles.brandTag}>{nav.brandTag}</span>
          </span>
        </Link>

        <button
          type="button"
          className={styles.menuToggle}
          aria-expanded={open}
          aria-controls="primary-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">{open ? nav.menuCloseLabel : nav.menuOpenLabel}</span>
          <span className={styles.burger} aria-hidden="true" />
        </button>

        <nav
          id="primary-nav"
          className={`${styles.nav} ${open ? styles.navOpen : ""}`}
          aria-label={nav.primaryAriaLabel}
        >
          {mainNav.map((item) => {
            const active = isActive(pathname, item.href, item.children);
            if (item.children) {
              return (
                <div
                  key={item.label}
                  className={`${styles.dropdown} ${active ? styles.activeParent : ""}`}
                >
                  <button
                    type="button"
                    className={`${styles.link} ${active ? styles.active : ""}`}
                    aria-haspopup="true"
                    aria-current={active ? "true" : undefined}
                  >
                    {item.label}{" "}
                    <span className={styles.indicator} aria-hidden="true">
                      +
                    </span>
                  </button>
                  <div className={`${styles.menu} ${styles.mega}`} role="menu">
                    {item.children.map((c) => (
                      <Link
                        key={c.href}
                        href={c.href}
                        role="menuitem"
                        className={pathname === c.href ? styles.menuActive : undefined}
                        onClick={close}
                      >
                        <span className={styles.megaTitle}>{c.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href!}
                className={`${styles.link} ${active ? styles.active : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={close}
              >
                {item.label}
              </Link>
            );
          })}
          {donateItem.href ? (
            <Link
              href={donateItem.href}
              className={`${styles.donate} ${
                isActive(pathname, donateItem.href) ? styles.donateActive : ""
              }`}
              aria-current={isActive(pathname, donateItem.href) ? "page" : undefined}
              onClick={close}
            >
              {donateItem.label}
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
