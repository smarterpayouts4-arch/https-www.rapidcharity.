import Link from "next/link";
import type { ActiveAnnouncement } from "@/lib/content/announcement";
import styles from "./AnnouncementBanner.module.css";

export function AnnouncementBanner({ announcement }: { announcement: ActiveAnnouncement }) {
  const external = /^https?:\/\//.test(announcement.linkHref);
  return (
    <div className={styles.bar} role="region" aria-label="Announcement" data-testid="announcement-banner">
      <div className={`container ${styles.inner}`}>
        <p className={styles.text}>{announcement.text}</p>
        {announcement.linkHref && announcement.linkLabel ? (
          external ? (
            <a className={styles.link} href={announcement.linkHref} target="_blank" rel="noopener noreferrer">
              {announcement.linkLabel} <span aria-hidden="true">→</span>
            </a>
          ) : (
            <Link className={styles.link} href={announcement.linkHref}>
              {announcement.linkLabel} <span aria-hidden="true">→</span>
            </Link>
          )
        ) : null}
      </div>
    </div>
  );
}
