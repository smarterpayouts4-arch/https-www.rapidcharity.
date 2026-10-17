"use client";

import { useMemo, useState } from "react";
import { PostCard, PostGrid } from "@/components/blog/PostCard";
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
      <PostGrid variant="page">
        {filtered.map((post, index) => (
          <PostCard
            key={post.slug}
            post={post}
            categoryLabels={post.categories.map(
              (slug) => categories.find((item) => item.slug === slug)?.label ?? slug,
            )}
            minReadSuffix={minReadSuffix}
            sizes="(max-width: 639px) 50vw, (max-width: 1279px) 33vw, 25vw"
            priority={index < 2}
          />
        ))}
      </PostGrid>
      {filtered.length === 0 ? <p className="meta">{labels.noResultsLabel}</p> : null}
    </div>
  );
}
