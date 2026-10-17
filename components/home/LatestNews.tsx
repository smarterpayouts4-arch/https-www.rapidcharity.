import Link from "next/link";
import type { SiteContent } from "@/lib/content/schema";
import { PostCard, PostGrid } from "@/components/blog/PostCard";
import type { HomePost } from "./homePosts";
import styles from "./LatestNews.module.css";

type Props = {
  content: SiteContent["latestNews"];
  posts: HomePost[];
  minReadSuffix: string;
};

export function LatestNews({ content, posts, minReadSuffix }: Props) {
  return (
    <section className={styles.section} aria-labelledby="news-heading">
      <div className="container">
        <div className={styles.header} data-reveal>
          <div className={styles.intro}>
            <p className="eyebrow">{content.eyebrow}</p>
            <h2 id="news-heading" className={styles.title}>
              {content.title}
            </h2>
          </div>
          <Link className={`btn-secondary ${styles.desktopCta}`} href={content.ctaHref}>
            {content.ctaLabel} <span aria-hidden="true">→</span>
          </Link>
          <Link className={styles.seeAll} href={content.ctaHref}>
            See all <span aria-hidden="true">→</span>
          </Link>
        </div>

        <PostGrid variant="home3">
          {posts.map(({ post, categoryLabels }) => (
            <PostCard
              key={post.slug}
              post={post}
              categoryLabels={categoryLabels}
              minReadSuffix={minReadSuffix}
              sizes="(max-width: 1023px) 50vw, 33vw"
            />
          ))}
        </PostGrid>
      </div>
    </section>
  );
}
