import Link from "next/link";
import type { SiteContent } from "@/lib/content/schema";
import styles from "./Leadership.module.css";

type Props = {
  content: SiteContent["leadership"];
};

export function Leadership({ content }: Props) {
  return (
    <section className={styles.section} aria-labelledby="leadership-heading">
      <div className="container">
        <div className={styles.header} data-reveal>
          <div>
            <p className="eyebrow">{content.eyebrow}</p>
            <h2 id="leadership-heading" className={styles.title}>
              {content.title}
            </h2>
            <p className={styles.lead}>{content.lead}</p>
          </div>
          <Link className="btn-secondary" href={content.ctaHref}>
            {content.ctaLabel} <span aria-hidden="true">→</span>
          </Link>
        </div>

        <ul className={styles.row} aria-label={content.listAriaLabel}>
          {content.seats.map((s) => (
            <li key={s.initials} className={styles.person} data-reveal-item>
              <span className={styles.avatar} aria-hidden="true">
                {s.initials}
              </span>
              <span className={styles.name}>{s.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
