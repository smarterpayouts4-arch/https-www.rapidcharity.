import Image from "next/image";
import Link from "next/link";
import type { BlogPost } from "@/lib/content";
import styles from "./PostCard.module.css";

export function formatPostDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type CardProps = {
  post: BlogPost;
  /** Category labels to show as the card kicker (first one is used). */
  categoryLabels?: string[];
  minReadSuffix?: string;
  headingLevel?: "h2" | "h3";
  sizes?: string;
  priority?: boolean;
};

/** Blog teaser card: photo on top, category, title, excerpt, date and read time. */
export function PostCard({
  post,
  categoryLabels = [],
  minReadSuffix = "min read",
  headingLevel = "h3",
  sizes = "(max-width: 1023px) 50vw, 25vw",
  priority = false,
}: CardProps) {
  const Heading = headingLevel;
  const href = `/post/${post.slug}`;
  return (
    <article className={styles.card} data-reveal-item>
      <Link href={href} className={styles.link}>
        <div className={styles.media}>
          {post.image ? (
            <Image
              src={post.image}
              alt={post.imageAlt || post.title}
              fill
              sizes={sizes}
              preload={priority}
              className={styles.img}
            />
          ) : (
            <div className={styles.placeholder} aria-hidden="true" />
          )}
        </div>
        <div className={styles.body}>
          {categoryLabels.length > 0 ? (
            <p className={styles.kicker}>{categoryLabels[0]}</p>
          ) : null}
          <Heading className={styles.title}>{post.title}</Heading>
          <p className={styles.excerpt}>{post.excerpt}</p>
          <p className={styles.meta}>
            <time dateTime={post.date}>{formatPostDate(post.date)}</time>
            <span aria-hidden="true"> · </span>
            <span>
              {post.readMinutes} {minReadSuffix}
            </span>
          </p>
        </div>
      </Link>
    </article>
  );
}

type GridProps = {
  children: React.ReactNode;
  /** "page": 2 / 3 / 4 columns. "home4": 2 / 2 / 4. "home3": 2 / 2 / 3. */
  variant?: "page" | "home4" | "home3";
  className?: string;
};

export function PostGrid({ children, variant = "page", className }: GridProps) {
  return (
    <div className={`${styles.grid} ${styles[variant]} ${className ?? ""}`}>{children}</div>
  );
}
