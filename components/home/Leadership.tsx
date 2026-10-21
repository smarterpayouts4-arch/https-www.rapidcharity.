import Link from "next/link";
import type { SiteContent } from "@/lib/content/schema";
import styles from "./Leadership.module.css";

type Props = {
  content: SiteContent["leadership"];
};

/**
 * Board section. No names or photos exist yet, so the seats show as one
 * compact card: an overlapping row of numbered monograms, the seat count,
 * and "Meet Our Board" as the card's action.
 */
export function Leadership({ content }: Props) {
  const seatLabel = content.seats[0]?.label ?? "";
  const allSame = content.seats.every((s) => s.label === seatLabel);
  const countLabel = allSame && seatLabel ? `${content.seats.length} ${seatLabel}s` : null;
  return (
    <section className={styles.section} aria-labelledby="leadership-heading">
      <div className="container">
        <div className={styles.header} data-reveal>
          <p className="eyebrow">{content.eyebrow}</p>
          <h2 id="leadership-heading" className={styles.title}>
            {content.title}
          </h2>
          <p className={styles.lead}>{content.lead}</p>
        </div>

        <div className={styles.board} data-reveal>
          <ul className={styles.stack} aria-label={content.listAriaLabel}>
            {content.seats.map((s) => (
              <li key={s.initials} className={styles.seat} title={s.label}>
                <span className={styles.monogram} aria-hidden="true">
                  {s.initials}
                </span>
                <span className={allSame ? "sr-only" : styles.role}>{s.label}</span>
              </li>
            ))}
          </ul>
          {countLabel ? (
            <p className={styles.count} aria-hidden="true">
              {countLabel}
            </p>
          ) : null}
          <Link className={`btn-secondary ${styles.cta}`} href={content.ctaHref}>
            {content.ctaLabel} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
