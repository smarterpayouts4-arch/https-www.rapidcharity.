import Image from "next/image";
import Link from "next/link";
import type { SiteContent } from "@/lib/content/schema";
import styles from "./Footer.module.css";
import { SubscribeForm } from "./SubscribeForm";

type Props = {
  footer: SiteContent["footer"];
  brandName: string;
  brandTag: string;
};

export function Footer({ footer, brandName, brandTag }: Props) {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <p className={styles.wordmark} data-reveal>{brandName}</p>
        <div className={styles.grid}>
          <div className={styles.brandCol}>
            <Link href="/" className={styles.brand}>
              <Image
                src={footer.logo.src}
                alt={footer.logo.alt}
                width={96}
                height={56}
                style={{ width: "auto", height: "auto" }}
              />
              <span>
                <span className={styles.brandName}>{brandName}</span>
                <span className={styles.brandTag}>{brandTag}</span>
              </span>
            </Link>
            <p className={styles.tagline}>{footer.tagline}</p>
          </div>

          <div className={styles.col}>
            <h3>{footer.quickLinksTitle}</h3>
            <ul className={styles.links}>
              {footer.quickLinks.map((l) => (
                <li key={`${l.href}-${l.label}`}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.col}>
            <h3>{footer.contactTitle}</h3>
            <ul className={styles.contact}>
              <li>
                <a href={`mailto:${footer.email}`}>{footer.email}</a>
              </li>
              {footer.contactLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          <div className={`${styles.col} ${styles.subscribeCol}`}>
            <h3>{footer.communityTitle}</h3>
            <SubscribeForm content={footer.subscribe} email={footer.email} />
            <div className={styles.social}>
              <a
                href={footer.social.facebook.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={footer.social.facebook.label}
                className={styles.socialBtn}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M14 8.5h2.5V5.2C16.1 5.1 15 5 13.7 5 11.1 5 9.3 6.6 9.3 9.5V12H6.5v3.5h2.8V22h3.5v-6.5H15l.5-3.5h-2.9V9.8c0-1 .3-1.3 1.4-1.3z" />
                </svg>
              </a>
              <a
                href={footer.social.instagram.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={footer.social.instagram.label}
                className={styles.socialBtn}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M7 3h10a4 4 0 014 4v10a4 4 0 01-4 4H7a4 4 0 01-4-4V7a4 4 0 014-4zm10 2H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2zm-5 3.2A3.8 3.8 0 1112 16.8 3.8 3.8 0 0112 8.2zm0 1.6a2.2 2.2 0 100 4.4 2.2 2.2 0 000-4.4zM17.2 6.9a.9.9 0 11-1.8 0 .9.9 0 011.8 0z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className={styles.bottom}>
          <span>
            © {new Date().getFullYear()} {footer.copyrightName}. {footer.copyrightSuffix}
          </span>
          <nav className={styles.legal} aria-label={footer.legalAriaLabel}>
            {footer.legal.map((l) => (
              <Link key={l.href} href={l.href}>
                {l.label}
              </Link>
            ))}
            <a href={`mailto:${footer.email}`}>{footer.contactLinkLabel}</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
