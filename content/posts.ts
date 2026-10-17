/**
 * Compatibility surface for published blog posts.
 * Source of truth: content/blog.json (+ content/blog.draft.json for preview).
 * Prefer loadBlogContent() in server components so draft/preview works.
 */
import published from "./blog.json";
import type { BlogPost as SchemaBlogPost } from "@/lib/content/blogSchema";

export type BlogPost = SchemaBlogPost;

export const posts: BlogPost[] = published.posts as BlogPost[];
export const categories = published.categories;
export const tags = published.tags;

export function getPost(slug: string) {
  return posts.find((post) => post.slug === slug);
}

export function getPostsByCategory(slug: string) {
  return posts.filter((post) => post.categories.includes(slug));
}

export function getPostsByTag(slug: string) {
  return posts.filter((post) => post.tags.includes(slug));
}

export function getRecentPosts(excludeSlug?: string, limit = 3) {
  return [...posts]
    .filter((post) => post.slug !== excludeSlug)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}
