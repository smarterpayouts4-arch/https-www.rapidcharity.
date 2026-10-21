import Link from "next/link";
import type { SiteContent } from "@/lib/content/schema";
import styles from "./ScholarshipPrograms.module.css";

type Props = {
  content: SiteContent["scholarshipPrograms"];
};

/** Short eligibility tags, identical to the program cards on /apply. */
const ELIGIBILITY: Record<string, string> = {
  "/general-8": "All fields except business",
  "/robert-mathais-scholarship": "Business students",
  "/ivy-azariah-scholarship": "Women only",
};

/**
 * Compact program list: one grouped card of tappable rows on phones and
 * tablets (number chip, title, eligibility tag, chevron), three compact
 * whole-card links across on desktop where the one-sentence blurb also shows.
 */
export function ScholarshipPrograms({ content }: Props) {
  return (
    <section className={styles.section} aria-labelledby="scholarships-heading">
      <div className="container">
        <div className={styles.header} data-reveal>
          <div className={styles.intro}>
            <p className="eyebrow">{content.eyebrow}</p>
            <h2 id="scholarships-heading" className={styles.title}>
              {content.title}
            </h2>
            <p className={styles.lead}>{content.lead}</p>
          </div>
          <Link className={`btn-secondary ${styles.desktopCta}`} href={content.ctaHref}>
            {content.ctaLabel} <span aria-hidden="true">→</span>
          </Link>
          <Link className={styles.seeAll} href={content.ctaHref}>
            See all <span aria-hidden="true">→</span>
          </Link>
        </div>

        <ul className={styles.programList} data-reveal>
          {content.programs.map((p, index) => {
            const tag = ELIGIBILITY[p.href];
            return (
              <li key={p.href} className={styles.programItem}>
                <Link href={p.href} className={styles.programRow}>
                  <span className={styles.programNum} aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className={styles.programText}>
                    <h3 className={styles.programTitle}>{p.title}</h3>
                    {tag ? <span className={styles.programTag}>{tag}</span> : null}
                    <span className={styles.programBlurb}>{p.blurb}</span>
                    <span className={styles.programMore}>
                      {p.learnMoreLabel} <span aria-hidden="true">→</span>
                    </span>
                  </div>
                  <svg
                    className={styles.programChevron}
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
