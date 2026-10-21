import Link from "next/link";
import type { SiteContent } from "@/lib/content/schema";
import { ApplicationCard } from "./ApplicationCard";
import { HeroMedia } from "./HeroMedia";
import styles from "./Hero.module.css";

type Props = {
  content: SiteContent["hero"];
  applicationCard: SiteContent["applicationCard"];
  intakes?: SiteContent["intakes"];
};

export function Hero({ content, applicationCard, intakes }: Props) {
  return (
    <section className={styles.hero} aria-label={content.ariaLabel} data-hero-root>
      <div className={styles.intro}>
        <div className={styles.copy} data-hero-copy>
          <p className={styles.eyebrow}>{content.eyebrow}</p>
          <h1 className={styles.title}>
            <span className={`${styles.titleLine} ${styles.titleInk}`}>{content.titleLine1}</span>{" "}
            <span className={`${styles.titleLine} ${styles.titleBrand}`}>{content.titleLine2}</span>
          </h1>
          <p className={styles.lead}>{content.lead}</p>
          <div className={styles.ctas}>
            <Link className="btn" href={content.primaryCta.href}>
              {content.primaryCta.label} <span aria-hidden="true">→</span>
            </Link>
            <Link className="btn-secondary" href={content.secondaryCta.href}>
              {content.secondaryCta.label} <span aria-hidden="true">→</span>
            </Link>
          </div>
          <blockquote className={styles.quote}>
            <p>&ldquo;{content.quote}&rdquo;</p>
          </blockquote>
        </div>
        <ApplicationCard className={styles.appCardDesktop} content={applicationCard} intakes={intakes} />
      </div>
      <HeroMedia slides={content.slides} ariaLabel={content.slidesAriaLabel} />
      <div className={styles.after}>
        <ApplicationCard className={styles.appCardMobile} content={applicationCard} intakes={intakes} />
        <p className={styles.motif} aria-hidden="true">
          {content.motif}
        </p>
      </div>
    </section>
  );
}
