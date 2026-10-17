"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { BlogPost, BlogTaxonomy } from "@/lib/content";
import styles from "./BlogSearch.module.css";

type Labels = {
  searchLabel: string;
  searchPlaceholder: string;
  noResultsLabel: string;
};

export function BlogSearch({
  posts,
  categories,
  labels,
  minReadSuffix,
}: {
  posts: BlogPost[];
  categories: BlogTaxonomy[];
  labels: Labels;
  minReadSuffix: string;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return posts;
    return posts.filter(
      (post) =>
        post.title.toLowerCase().includes(needle) ||
        post.excerpt.toLowerCase().includes(needle) ||
        post.body.toLowerCase().includes(needle) ||
        post.categories.some((slug) =>
          (categories.find((item) => item.slug === slug)?.label ?? slug)
            .toLowerCase()
            .includes(needle),
        ),
    );
  }, [posts, query, categories]);

  return (
    <div>
      <label className="sr-only" htmlFor="blog-search">
        {labels.searchLabel}
      </label>
      <input
        id="blog-search"
        type="search"
        placeholder={labels.searchPlaceholder}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className={styles.search}
      />
      <div className={styles.grid}>
        {filtered.map((post) => (
          <article key={post.slug} className={styles.card} data-reveal-item>
            <Link href={`/post/${post.slug}`} className={styles.cardLink}>
              <div className={styles.thumb}>
                {post.image ? (
                  <Image
                    src={post.image}
                    alt={post.imageAlt || post.title}
                    width={480}
                    height={280}
                    className={styles.img}
                  />
                ) : (
                  <div className={styles.placeholder} />
                )}
              </div>
              <div className={styles.body}>
                <p className={styles.cats}>
                  {post.categories.map((slug) => (
                    <span key={slug} className={styles.chip}>
                      {categories.find((item) => item.slug === slug)?.label ?? slug}
                    </span>
                  ))}
                </p>
                <h3 className={styles.title}>{post.title}</h3>
                <p className={`meta ${styles.meta}`}>
                  {post.author} · {post.date} · {post.readMinutes} {minReadSuffix}
                </p>
                <p className={styles.excerpt}>{post.excerpt}</p>
              </div>
            </Link>
          </article>
        ))}
      </div>
      {filtered.length === 0 ? <p className="meta">{labels.noResultsLabel}</p> : null}
    </div>
  );
}
