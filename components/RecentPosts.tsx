import Image from "next/image";
import Link from "next/link";
import type { BlogPost } from "@/lib/content";
import styles from "./RecentPosts.module.css";

export function RecentPosts({
  posts,
  title,
  seeAllLabel,
}: {
  posts: BlogPost[];
  title: string;
  seeAllLabel: string;
}) {
  if (!posts.length) return null;
  return (
    <section className={styles.section} aria-labelledby="recent-posts-heading">
      <div className={styles.head}>
        <h2 id="recent-posts-heading">{title}</h2>
        <Link href="/blog" className={styles.seeAll}>
          {seeAllLabel}
        </Link>
      </div>
      <div className={styles.grid}>
        {posts.map((post) => (
          <article key={post.slug} className={styles.card}>
            <Link href={`/post/${post.slug}`} className={styles.cardLink}>
              <div className={styles.thumb}>
                {post.image ? (
                  <Image
                    src={post.image}
                    alt={post.imageAlt || post.title}
                    width={400}
                    height={220}
                    className={styles.img}
                  />
                ) : (
                  <div className={styles.placeholder} />
                )}
              </div>
              <h3 className={styles.title}>{post.title}</h3>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
