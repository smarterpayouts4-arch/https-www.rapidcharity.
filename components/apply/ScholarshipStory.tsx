import type { ReactNode } from "react";
import styles from "./ScholarshipStory.module.css";

export type StoryFact = { label: string; text: string };

export function ScholarshipStory({
  intro,
  facts,
  points,
  children,
}: {
  intro: string;
  facts: StoryFact[];
  points?: string[];
  children: ReactNode;
}) {
  return (
    <div className={styles.story}>
      <p className={styles.intro}>{intro}</p>
      <dl className={styles.facts}>
        {facts.map((fact) => (
          <div key={fact.label} className={styles.fact}>
            <dt>{fact.label}</dt>
            <dd>{fact.text}</dd>
          </div>
        ))}
      </dl>
      {points && points.length > 0 ? (
        <ul className={styles.points}>
          {points.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      <details className={styles.full}>
        <summary>Read the full story</summary>
        <div className={styles.fullBody}>{children}</div>
      </details>
    </div>
  );
}
