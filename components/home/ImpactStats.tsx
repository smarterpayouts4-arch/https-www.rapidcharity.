import type { SiteContent } from "@/lib/content/schema";
import { CountUp } from "./CountUp";
import styles from "./ImpactStats.module.css";

const ICONS = [
  (
    <svg key="shield" width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3l8 4.5v2.2c0 4.4-3.2 8.4-8 9.8-4.8-1.4-8-5.4-8-9.8V7.5L12 3z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  (
    <svg key="people" width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.5 19c.6-3 2.8-4.5 5.5-4.5S14 16 14.5 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14 14.5c2 .2 3.8 1.3 4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  (
    <svg key="board" width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="7" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 11h18M8 7V5a1 1 0 011-1h6a1 1 0 011 1v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  (
    <svg key="globe" width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 12h18M12 3c2.5 2.8 3.8 5.8 3.8 9s-1.3 6.2-3.8 9c-2.5-2.8-3.8-5.8-3.8-9S9.5 5.8 12 3z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
];

type Props = {
  content: SiteContent["impactStats"];
};

export function ImpactStats({ content }: Props) {
  return (
    <section className={styles.band} aria-labelledby="impact-heading">
      <div className={`container ${styles.inner}`}>
        <div className={styles.intro} data-reveal>
          <p className="eyebrow">{content.eyebrow}</p>
          <h2 id="impact-heading" className={styles.title}>
            {content.title}
          </h2>
        </div>
        <ul className={styles.stats}>
          {content.stats.map((s, i) => (
            <li key={s.label} className={styles.stat} data-reveal-item>
              <p className={styles.label}>{s.label}</p>
              <p className={styles.value}><CountUp value={s.value} /></p>
              {s.hint ? <p className={styles.hint}>{s.hint}</p> : null}
              <span className={styles.icon}>{ICONS[i % ICONS.length]}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
