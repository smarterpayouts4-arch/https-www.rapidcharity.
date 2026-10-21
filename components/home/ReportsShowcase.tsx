import { existsSync } from "fs";
import { join } from "path";
import Link from "next/link";
import type { SiteContent } from "@/lib/content/schema";
import styles from "./ReportsShowcase.module.css";

type Props = {
  content: SiteContent["reportsShowcase"];
  remoteHref?: string;
};

function downloadTarget(href: string, remoteHref?: string): { href: string; external: boolean; download: boolean } {
  const local =
    href.startsWith("/") && existsSync(join(process.cwd(), "public", href.replace(/^\//, "")));
  if (local) return { href, external: false, download: true };
  const configured = process.env.REPORT_2025_URL?.trim();
  if (configured) return { href: configured, external: true, download: false };
  if (remoteHref?.trim()) return { href: remoteHref.trim(), external: true, download: false };
  return { href, external: false, download: false };
}

export function ReportsShowcase({ content, remoteHref }: Props) {
  const download = downloadTarget(content.downloadHref, remoteHref);
  return (
    <section className={styles.section} aria-labelledby="reports-heading" data-reveal>
      <div className={`container ${styles.inner}`}>
        <div className={styles.copy}>
          <p className="eyebrow">{content.eyebrow}</p>
          <h2 id="reports-heading" className={styles.title}>
            {content.title}
          </h2>
          <p className={styles.lead}>{content.lead}</p>
        </div>
        <article className={styles.card} aria-labelledby="reports-card-title">
          <div className={styles.cardHead}>
            <span className={styles.cardBadge} aria-hidden="true">
              {content.cardBadge}
            </span>
            <div className={styles.cardText}>
              <p className={styles.cardEyebrow}>{content.cardEyebrow}</p>
              <h3 id="reports-card-title" className={styles.cardTitle}>
                {content.cardTitle}
              </h3>
              <p className={styles.cardMeta}>{content.cardMeta}</p>
            </div>
          </div>
          <div className={styles.actions}>
            <Link className={`btn ${styles.action}`} href={content.viewHref}>
              {content.viewLabel} <span aria-hidden="true">→</span>
            </Link>
            <a
              className={`btn-secondary ${styles.action}`}
              href={download.href}
              {...(download.download ? { download: true } : {})}
              {...(download.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {content.downloadLabel}
            </a>
          </div>
        </article>
      </div>
    </section>
  );
}
