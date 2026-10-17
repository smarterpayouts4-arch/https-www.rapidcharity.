import Link from "next/link";
import type { SiteContent } from "@/lib/content/schema";
import { ApplicationCard } from "./ApplicationCard";
import { HeroMedia } from "./HeroMedia";
import styles from "./Hero.module.css";

type Props = {
  content: SiteContent["hero"];
  applicationCard: SiteContent["applicationCard"];
};

function TitleLine({ text }: { text: string }) {
  const space = text.indexOf(" ");
  if (space === -1) return text;
  return (
    <>
      {text.slice(0, space)}
      <br className={styles.mobileBreak} />
      <span className={styles.desktopSpace}> </span>
      {text.slice(space + 1)}
    </>
  );
}

export function Hero({ content, applicationCard }: Props) {
  return (
    <section className={styles.hero} aria-label={content.ariaLabel} data-hero-root>
      <div className={styles.intro}>
        <div className={styles.copy} data-hero-copy>
          <p className={styles.eyebrow}>{content.eyebrow}</p>
          <h1 className={styles.title}>
            <span className={styles.titleInk}>
              <TitleLine text={content.titleLine1} />
            </span>
            <br />
            <span className={styles.titleBrand}>{content.titleLine2}</span>
          </h1>
          <p className={styles.lead}>{content.lead}</p>
          <div className={styles.ctas}>
            <Link className="btn" href={content.primaryCta.href}>
              {content.primaryCta.label} <span aria-hidden="true">→</span>
            </Link>
            <Link className="btn-white" href={content.secondaryCta.href}>
              {content.secondaryCta.label} <span aria-hidden="true">→</span>
            </Link>
          </div>
          <blockquote className={styles.quote}>
            <p>&ldquo;{content.quote}&rdquo;</p>
          </blockquote>
        </div>
        <ApplicationCard className={styles.appCardDesktop} content={applicationCard} />
      </div>
      <HeroMedia slides={content.slides} ariaLabel={content.slidesAriaLabel} />
      <div className={styles.after}>
        <ApplicationCard className={styles.appCardMobile} content={applicationCard} />
        <p className={styles.motif} aria-hidden="true">
          {content.motif}
        </p>
      </div>
    </section>
  );
}
