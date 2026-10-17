"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { SiteContent } from "@/lib/content/schema";
import styles from "./Header.module.css";

function isActive(pathname: string, href?: string, children?: { href: string }[]) {
  if (href) {
    if (href === "/") return pathname === "/";
    if (href === "/blog") {
      return pathname === "/blog" || pathname.startsWith("/blog/") || pathname.startsWith("/post/");
    }
    if (href === "/apply") {
      return pathname === "/apply" || pathname.startsWith("/apply/") || pathname === "/education-scholarships1";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  if (children?.length) {
    return children.some((child) => pathname === child.href || pathname.startsWith(`${child.href}/`));
  }
  return false;
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Arrow({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M6 3.5L10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type Props = { nav: SiteContent["nav"]; programBlurbs?: Record<string, string> };

export function Header({ nav, programBlurbs = {} }: Props) {
  const [open, setOpen] = useState(false);
  const [accordion, setAccordion] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [suppressed, setSuppressed] = useState(false);
  const pathname = usePathname() || "/";
  const [trackedPath, setTrackedPath] = useState(pathname);
  const menuId = useId();
  const accordionId = useId();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  if (trackedPath !== pathname) {
    setTrackedPath(pathname);
    setOpen(false);
    setPinned(false);
    setSuppressed(false);
  }

  function closeDrawer(restoreFocus = true) {
    setOpen(false);
    if (restoreFocus) menuToggleRef.current?.focus();
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the drawer if the viewport grows to desktop.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => mq.matches && setOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!open) return;
    const { overflow, paddingRight } = document.body.style;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
    const raf = requestAnimationFrame(() => {
      drawerRef.current?.querySelector<HTMLElement>("[data-drawer-close]")?.focus();
    });
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [open]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (open) {
        closeDrawer(true);
        return;
      }
      if (pinned) {
        setPinned(false);
        setSuppressed(true);
        toggleRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pinned]);

  useEffect(() => {
    if (!pinned) return;
    const onPointer = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) setPinned(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [pinned]);

  function trapFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab" || !drawerRef.current) return;
    const items = [
      ...drawerRef.current.querySelectorAll<HTMLElement>("button, a[href]"),
    ].filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function onDropdownKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!pinned) return;
    const root = dropdownRef.current;
    if (!root) return;
    const items = [...root.querySelectorAll<HTMLElement>("button, a[href]")];
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = event.key === "ArrowDown" ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
      items[next]?.focus();
    }
  }

  const mainNav = nav.items.filter(
    (item) => item.label !== nav.donateCta.label && item.href !== nav.donateCta.href,
  );
  const donate = nav.donateCta;
  const donateActive = isActive(pathname, donate.href);
  const applyItem = mainNav.find((item) => item.href === "/apply");

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ""}`}>
      <div className={`container ${styles.bar}`}>
        <Link href="/" className={styles.brand} aria-label={nav.homeAriaLabel}>
          <Image src={nav.logo.src} alt={nav.logo.alt} width={79} height={46} className={styles.logo} priority />
          <span className={styles.brandText}>
            <span className={styles.brandName}>{nav.brandName}</span>
            <span className={styles.brandTag}>{nav.brandTag}</span>
          </span>
        </Link>

        {/* Desktop navigation */}
        <nav className={styles.nav} aria-label={nav.primaryAriaLabel}>
          <ul className={styles.navList}>
            {mainNav.map((item) => {
              const active = isActive(pathname, item.href, item.children);
              if (item.children) {
                return (
                  <li key={item.label}>
                    <div
                      ref={dropdownRef}
                      className={`${styles.dropdown} ${pinned ? styles.dropdownPinned : ""} ${suppressed ? styles.dropdownSuppressed : ""}`}
                      onKeyDown={onDropdownKeyDown}
                      onMouseLeave={() => setSuppressed(false)}
                    >
                      <button
                        ref={toggleRef}
                        type="button"
                        className={`${styles.link} ${active ? styles.active : ""}`}
                        aria-haspopup="true"
                        aria-expanded={pinned}
                        aria-controls={menuId}
                        aria-current={active ? "true" : undefined}
                        onClick={() => {
                          if (pinned) {
                            setPinned(false);
                            setSuppressed(true);
                          } else {
                            setSuppressed(false);
                            setPinned(true);
                          }
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "ArrowDown") {
                            event.preventDefault();
                            setSuppressed(false);
                            setPinned(true);
                            requestAnimationFrame(() => {
                              dropdownRef.current?.querySelector<HTMLElement>("a[href]")?.focus();
                            });
                          }
                        }}
                      >
                        {item.label}
                        <Chevron className={styles.chevron} />
                      </button>
                      <div id={menuId} className={styles.menu}>
                        <ul className={styles.menuList}>
                          {item.children.map((child) => {
                            const childActive = pathname === child.href;
                            return (
                              <li key={child.href}>
                                <Link
                                  href={child.href}
                                  className={`${styles.menuItem} ${childActive ? styles.menuActive : ""}`}
                                  aria-current={childActive ? "page" : undefined}
                                >
                                  <span className={styles.menuTitle}>
                                    {child.label}
                                    <Arrow className={styles.menuArrow} />
                                  </span>
                                  {programBlurbs[child.href] ? (
                                    <span className={styles.menuDesc}>{programBlurbs[child.href]}</span>
                                  ) : null}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  </li>
                );
              }
              return (
                <li key={item.href}>
                  <Link
                    href={item.href!}
                    className={`${styles.link} ${active ? styles.active : ""}`}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link
            href={donate.href}
            className={`${styles.donate} ${donateActive ? styles.donateActive : ""}`}
            aria-current={donateActive ? "page" : undefined}
          >
            {donate.label}
          </Link>
        </nav>

        <button
          ref={menuToggleRef}
          type="button"
          className={`${styles.menuToggle} ${open ? styles.menuToggleOpen : ""}`}
          aria-expanded={open}
          aria-controls="mobile-drawer"
          aria-label={open ? nav.menuCloseLabel : nav.menuOpenLabel}
          onClick={() => setOpen((value) => !value)}
        >
          <span className={styles.burger} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>

      {/* Mobile and tablet drawer */}
      <div
        className={`${styles.backdrop} ${open ? styles.backdropOpen : ""}`}
        onClick={() => closeDrawer(true)}
        aria-hidden="true"
        data-testid="drawer-backdrop"
      />
      <div
        ref={drawerRef}
        id="mobile-drawer"
        className={`${styles.drawer} ${open ? styles.drawerOpen : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={nav.primaryAriaLabel}
        aria-hidden={!open}
        data-open={open ? "true" : "false"}
        inert={!open}
        onKeyDown={trapFocus}
      >
        <div className={styles.drawerHead}>
          <span className={styles.drawerBrand}>{nav.brandName}</span>
          <button
            type="button"
            className={styles.drawerClose}
            aria-label={nav.menuCloseLabel}
            data-drawer-close
            onClick={() => closeDrawer(true)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <nav className={styles.drawerNav} aria-label={`${nav.primaryAriaLabel} mobile`}>
          <ul className={styles.drawerList}>
            {mainNav.map((item) => {
              const active = isActive(pathname, item.href, item.children);
              if (item.children) {
                return (
                  <li key={item.label} className={styles.drawerRow}>
                    <button
                      type="button"
                      className={`${styles.drawerLink} ${active ? styles.drawerActive : ""}`}
                      aria-expanded={accordion}
                      aria-controls={accordionId}
                      onClick={() => setAccordion((value) => !value)}
                    >
                      <span>{item.label}</span>
                      <Chevron className={`${styles.drawerChevron} ${accordion ? styles.drawerChevronOpen : ""}`} />
                    </button>
                    <div
                      id={accordionId}
                      className={`${styles.accordion} ${accordion ? styles.accordionOpen : ""}`}
                      inert={!accordion}
                    >
                      <ul className={styles.subList}>
                        {item.children.map((child) => {
                          const childActive = pathname === child.href;
                          return (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                className={`${styles.subLink} ${childActive ? styles.drawerActive : ""}`}
                                aria-current={childActive ? "page" : undefined}
                                onClick={() => closeDrawer(false)}
                              >
                                <span>{child.label}</span>
                                <Arrow className={styles.rowArrow} />
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </li>
                );
              }
              return (
                <li key={item.href} className={styles.drawerRow}>
                  <Link
                    href={item.href!}
                    className={`${styles.drawerLink} ${active ? styles.drawerActive : ""}`}
                    aria-current={active ? "page" : undefined}
                    onClick={() => closeDrawer(false)}
                  >
                    <span>{item.label}</span>
                    <Arrow className={styles.rowArrow} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className={styles.drawerFoot}>
          <Link href={donate.href} className={styles.drawerDonate} onClick={() => closeDrawer(false)}>
            {donate.label}
          </Link>
          {applyItem?.href ? (
            <Link href={applyItem.href} className={styles.drawerApply} onClick={() => closeDrawer(false)}>
              {applyItem.label}
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
