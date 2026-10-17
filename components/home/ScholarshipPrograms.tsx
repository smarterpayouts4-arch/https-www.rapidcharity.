import Image from "next/image";
import Link from "next/link";
import type { SiteContent } from "@/lib/content/schema";
import styles from "./ScholarshipPrograms.module.css";

type Props = {
  content: SiteContent["scholarshipPrograms"];
};

export function ScholarshipPrograms({ content }: Props) {
  return (
    <section className={styles.section} aria-labelledby="scholarships-heading">
      <div className="container">
        <div className={styles.header} data-reveal>
          <div>
            <p className="eyebrow">{content.eyebrow}</p>
            <h2 id="scholarships-heading" className={styles.title}>
              {content.title}
            </h2>
            <p className={styles.lead}>{content.lead}</p>
          </div>
          <Link className="btn-secondary" href={content.ctaHref}>
            {content.ctaLabel} <span aria-hidden="true">→</span>
          </Link>
          <Link className={styles.seeAll} href={content.ctaHref}>
            See all <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className={styles.grid}>
          {content.programs.map((p) => (
            <article key={p.href} className={styles.card} data-reveal-item>
              <div className={styles.imageWrap}>
                <Image
                  src={p.image}
                  alt={p.alt}
                  width={480}
                  height={360}
                  sizes="(max-width: 700px) 100vw, 33vw"
                />
              </div>
              <div className={styles.body}>
                <p className={styles.chip}>Scholarship</p>
                <h3>{p.title}</h3>
                <p>{p.blurb}</p>
                <Link className={styles.more} href={p.href}>
                  {p.learnMoreLabel} <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
