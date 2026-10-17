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

type Props = { nav: SiteContent["nav"] };

export function Header({ nav }: Props) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [suppressed, setSuppressed] = useState(false);
  const pathname = usePathname() || "/";
  const [trackedPath, setTrackedPath] = useState(pathname);
  const menuId = useId();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const close = () => setOpen(false);

  if (trackedPath !== pathname) {
    setTrackedPath(pathname);
    setOpen(false);
    setPinned(false);
    setSuppressed(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (open) {
        setOpen(false);
        setPinned(false);
        setSuppressed(true);
        menuToggleRef.current?.focus();
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

  function closeDropdown(restoreFocus = false) {
    setPinned(false);
    setSuppressed(true);
    if (restoreFocus) toggleRef.current?.focus();
  }

  function onDropdownKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const desktop = window.matchMedia("(min-width: 981px)").matches;
    if (!desktop || !pinned) return;
    const root = dropdownRef.current;
    if (!root) return;
    const items = [...root.querySelectorAll<HTMLElement>("button, a[href]")];
    const current = document.activeElement as HTMLElement | null;
    const index = items.indexOf(current as HTMLElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = event.key === "ArrowDown" ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
      items[next]?.focus();
    }
    if (event.key === "Tab") {
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && current === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  }

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
            style={{ width: "auto", height: "auto" }}
          />
          <span className={styles.brandText}>
            <span className={styles.brandName}>{nav.brandName}</span>
            <span className={styles.brandTag}>{nav.brandTag}</span>
          </span>
        </Link>

        <button
          ref={menuToggleRef}
          type="button"
          className={styles.menuToggle}
          aria-expanded={open}
          aria-controls="primary-nav"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">{open ? nav.menuCloseLabel : nav.menuOpenLabel}</span>
          <span className={styles.burger} aria-hidden="true" />
        </button>

        <nav
          id="primary-nav"
          className={`${styles.nav} ${open ? styles.navOpen : ""}`}
          aria-label={nav.primaryAriaLabel}
          data-open={open ? "true" : "false"}
        >
          {mainNav.map((item) => {
            const active = isActive(pathname, item.href, item.children);
            if (item.children) {
              return (
                <div
                  key={item.label}
                  ref={dropdownRef}
                  className={`${styles.dropdown} ${active ? styles.activeParent : ""} ${pinned ? styles.dropdownPinned : ""} ${suppressed ? styles.dropdownSuppressed : ""}`}
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
                      if (pinned) closeDropdown(false);
                      else {
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
                    {item.label}{" "}
                    <span className={styles.indicator} aria-hidden="true">
                      +
                    </span>
                  </button>
                  <div id={menuId} className={`${styles.menu} ${styles.mega}`} role="menu" aria-label={item.label}>
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        role="menuitem"
                        className={pathname === child.href ? styles.menuActive : undefined}
                        aria-current={pathname === child.href ? "page" : undefined}
                        onClick={close}
                      >
                        <span className={styles.megaTitle}>{child.label}</span>
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
              className={`${styles.donate} ${isActive(pathname, donateItem.href) ? styles.donateActive : ""}`}
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
