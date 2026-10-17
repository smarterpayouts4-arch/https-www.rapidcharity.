import Link from "next/link";
import type { SiteContent } from "@/lib/content/schema";
import { PostCard, PostGrid } from "@/components/blog/PostCard";
import type { HomePost } from "./homePosts";
import styles from "./StudentStories.module.css";

type Props = {
  content: SiteContent["studentStories"];
  posts: HomePost[];
  minReadSuffix: string;
};

/** Student stories teaser: the scholars' newest blog stories as cards, "See all" opens the blog. */
export function StudentStories({ content, posts, minReadSuffix }: Props) {
  return (
    <section className={styles.section} aria-labelledby="stories-heading">
      <div className="container">
        <div className={styles.header} data-reveal>
          <div className={styles.intro}>
            <p className="eyebrow">{content.eyebrow}</p>
            <h2 id="stories-heading" className={styles.title}>{content.title}</h2>
            <p className={styles.lead}>{content.lead}</p>
          </div>
          <Link className={styles.seeAll} href="/blog">
            See all <span aria-hidden="true">→</span>
          </Link>
        </div>

        <PostGrid variant="home4">
          {posts.map(({ post, categoryLabels }) => (
            <PostCard
              key={post.slug}
              post={post}
              categoryLabels={categoryLabels}
              minReadSuffix={minReadSuffix}
              sizes="(max-width: 1023px) 50vw, 25vw"
            />
          ))}
        </PostGrid>

        <div className={styles.footer} data-reveal>
          <blockquote className={styles.quote}>
            <p>&ldquo;{content.quote}&rdquo;</p>
            <cite>{content.cite}</cite>
          </blockquote>
          <Link className="text-link-arrow" href={content.ctaHref}>
            {content.ctaLabel} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
