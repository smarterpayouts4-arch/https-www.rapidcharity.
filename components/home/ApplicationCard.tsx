import Link from "next/link";
import { DraftNotice } from "@/components/apply/DraftNotice";
import { applicationStatus } from "@/lib/application/intakes";
import type { SiteContent } from "@/lib/content/schema";
import styles from "./ApplicationCard.module.css";

function GraduationCapIcon() {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 3.5 1.5 9 12 14.5 22.5 9 12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 11.2v4.3c0 .9 2.9 2.7 6.5 2.7s6.5-1.8 6.5-2.7v-4.3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22.5 9v6.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

type Props = {
  className?: string;
  content: SiteContent["applicationCard"];
};

export function ApplicationCard({ className, content }: Props) {
  const status = applicationStatus();
  return (
    <aside
      className={`${styles.card}${className ? ` ${className}` : ""}`}
      aria-label={content.ariaLabel}
    >
      <div className={styles.head}>
        <GraduationCapIcon />
        <h2 className={styles.title}>{status.title}</h2>
      </div>
      <ul className={styles.meta}>
        <li>
          <strong>{status.deadlineLabel}</strong>
          <span>{status.deadlineValue}</span>
        </li>
        <li>
          <strong>{content.programsLabel}</strong>
          <span>{content.programsValue}</span>
        </li>
      </ul>
      <Link className={`btn ${styles.btn}`} href={content.applyHref}>
        {content.applyLabel} <span aria-hidden="true">→</span>
      </Link>
      <Link className={styles.guide} href={content.guideHref}>
        {content.guideLabel} <span aria-hidden="true">→</span>
      </Link>
      <DraftNotice compact />
    </aside>
  );
}
