import Image from "next/image";
import Link from "next/link";
import { loadBlogContent, visiblePosts } from "@/lib/content";
import type { SiteContent } from "@/lib/content/schema";
import styles from "./LatestNews.module.css";

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Graphic posters / announcements — letterbox with contain instead of cropping. */
const POSTER_MARKERS = [
  "spring-2027",
  "christmas",
  "easter",
  "fall-2025",
  "literacy",
  "annual",
  "invitation",
  "css-pms",
  "alumni-network",
  "merry-christmas",
  "honor",
  "badge",
  "seminar",
] as const;

export function isPosterImage(src?: string): boolean {
  if (!src) return false;
  const lower = src.toLowerCase();
  return POSTER_MARKERS.some((m) => lower.includes(m));
}

type Props = {
  content: SiteContent["latestNews"];
};

export async function LatestNews({ content }: Props) {
  const blog = await loadBlogContent();
  const categoryLabel = new Map(blog.categories.map((item) => [item.slug, item.label]));
  const latest = [...visiblePosts(blog)]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  return (
    <section className={styles.section} aria-labelledby="news-heading">
      <div className="container">
        <div className={styles.header} data-reveal>
          <div>
            <p className="eyebrow">{content.eyebrow}</p>
            <h2 id="news-heading" className={styles.title}>
              {content.title}
            </h2>
          </div>
          <Link className="btn-secondary" href={content.ctaHref}>
            {content.ctaLabel} <span aria-hidden="true">→</span>
          </Link>
          <Link className={styles.seeAll} href={content.ctaHref}>
            See all <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className={styles.grid}>
          {latest.map((post) => {
            const poster = isPosterImage(post.image);
            return (
              <article key={post.slug} className={styles.card} data-reveal-item>
                <Link href={`/post/${post.slug}`} className={styles.imageLink}>
                  <div
                    className={`${styles.imageWrap} ${poster ? styles.imageWrapPoster : ""}`}
                    data-fit={poster ? "contain" : "cover"}
                  >
                    {post.image ? (
                      <Image
                        src={post.image}
                        alt={post.imageAlt || post.title}
                        width={640}
                        height={440}
                        sizes="(max-width: 767px) 72px, (max-width: 900px) 50vw, 33vw"
                        className={poster ? styles.imgContain : styles.imgCover}
                        style={{ width: "100%", height: "100%" }}
                      />
                    ) : (
                      <div className={styles.placeholder} />
                    )}
                  </div>
                </Link>
                <div className={styles.body}>
                  {post.categories.length > 0 ? (
                    <p className={styles.tags}>
                      {post.categories.slice(0, 2).map((slug) => (
                        <span key={slug} className={styles.tag}>
                          {categoryLabel.get(slug) ?? slug}
                        </span>
                      ))}
                    </p>
                  ) : null}
                  <p className={styles.date}>{formatDate(post.date)}</p>
                  <h3>
                    <Link href={`/post/${post.slug}`}>{post.title}</Link>
                  </h3>
                  <p className={styles.excerpt}>{post.excerpt}</p>
                  <Link className="text-link-arrow" href={`/post/${post.slug}`}>
                    {content.readMoreLabel} <span aria-hidden="true">→</span>
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
