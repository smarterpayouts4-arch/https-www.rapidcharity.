import Link from "next/link";
import type { SiteContent } from "@/lib/content/schema";
import styles from "./DonateBanner.module.css";

type Props = {
  content: SiteContent["donateBanner"];
};

export function DonateBanner({ content }: Props) {
  return (
    <section className={styles.banner} aria-labelledby="donate-banner-heading">
      <div className={`container ${styles.shell}`}>
        <div className={styles.inner}>
          <div>
            <h2 id="donate-banner-heading" className={styles.title}>
              {content.title}
            </h2>
            <p className={styles.script}>{content.script}</p>
          </div>
          <Link className="btn-white" href={content.ctaHref}>
            {content.ctaLabel} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
