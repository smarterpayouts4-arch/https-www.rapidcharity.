import Image from "next/image";
import Link from "next/link";
import type { SiteContent } from "@/lib/content/schema";
import styles from "./ScholarshipPrograms.module.css";

type Props = {
  content: SiteContent["scholarshipPrograms"];
};

/**
 * Blog post photos (student stories) are not scholarship imagery. The original
 * site has no photos for the three programs, so cards stay text-only unless an
 * editor sets a dedicated scholarship image outside the blog folder.
 */
function programImage(src: string | undefined): string | null {
  if (!src) return null;
  if (src.startsWith("/assets/images/blog/")) return null;
  return src;
}

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

        <div className={styles.grid}>
          {content.programs.map((p, index) => {
            const image = programImage(p.image);
            return (
              <article key={p.href} className={styles.card} data-reveal-item>
                {image ? (
                  <div className={styles.imageWrap}>
                    <Image
                      src={image}
                      alt={p.alt}
                      width={480}
                      height={360}
                      sizes="(max-width: 700px) 100vw, 33vw"
                    />
                  </div>
                ) : null}
                <div className={styles.body}>
                  <p className={styles.chip}>
                    <span className={styles.num} aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    Scholarship
                  </p>
                  <h3>
                    <Link href={p.href} className={styles.titleLink}>
                      {p.title}
                    </Link>
                  </h3>
                  <p className={styles.blurb}>{p.blurb}</p>
                  <Link className={styles.more} href={p.href} aria-label={`${p.learnMoreLabel}: ${p.title}`}>
                    {p.learnMoreLabel} <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
