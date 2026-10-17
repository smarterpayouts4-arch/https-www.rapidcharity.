import Image from "next/image";
import Link from "next/link";
import type { SiteContent } from "@/lib/content/schema";
import { Reveal } from "@/components/motion/Reveal";
import styles from "./StudentStories.module.css";

type Props = {
  content: SiteContent["studentStories"];
};

export function StudentStories({ content }: Props) {
  return (
    <section className={styles.section} aria-labelledby="stories-heading">
      <div className={`container ${styles.grid}`}>
        <Reveal>
          <p className="eyebrow">{content.eyebrow}</p>
          <h2 id="stories-heading" className={styles.title}>{content.title}</h2>
          <p className={styles.lead}>{content.lead}</p>
          <blockquote className={styles.quote}>
            <p>&ldquo;{content.quote}&rdquo;</p>
            <cite>{content.cite}</cite>
          </blockquote>
          <Link className={`btn ${styles.desktopCta}`} href={content.ctaHref}>
            {content.ctaLabel} <span aria-hidden="true">→</span>
          </Link>
          <Link className={styles.seeAll} href={content.ctaHref}>
            See all <span aria-hidden="true">→</span>
          </Link>
        </Reveal>
        <div className={styles.frame}>
          <Image
            src={content.image}
            alt={content.imageAlt}
            fill
            sizes="(max-width: 800px) 100vw, 50vw"
          />
          <Link href={content.ctaHref} className={styles.play} aria-label={content.playAriaLabel}>
            <span className={styles.playIcon} aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5.5v13l11-6.5L8 5.5z" />
              </svg>
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
