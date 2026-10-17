import type { BlogCollection, BlogPost } from "@/lib/content";
import { visiblePosts } from "@/lib/content";

export const STORY_CATEGORY = "impact-stories";
export const STORY_COUNT = 4;
export const NEWS_COUNT = 6;

export type HomePost = { post: BlogPost; categoryLabels: string[] };

function newestFirst(blog: BlogCollection) {
  return [...visiblePosts(blog)].sort((a, b) => b.date.localeCompare(a.date));
}

function withLabels(blog: BlogCollection, post: BlogPost, lead?: string): HomePost {
  const label = new Map(blog.categories.map((c) => [c.slug, c.label]));
  const slugs = lead && post.categories.includes(lead)
    ? [lead, ...post.categories.filter((s) => s !== lead)]
    : post.categories;
  return { post, categoryLabels: slugs.map((s) => label.get(s) ?? s) };
}

/** Student stories: the newest Impact Stories posts (the scholars' own blog posts). */
export function homeStoryPosts(blog: BlogCollection): HomePost[] {
  return newestFirst(blog)
    .filter((p) => p.categories.includes(STORY_CATEGORY))
    .slice(0, STORY_COUNT)
    .map((p) => withLabels(blog, p, STORY_CATEGORY));
}

/** Latest news: the newest posts, skipping any already shown as student stories. */
export function homeNewsPosts(blog: BlogCollection, exclude: Set<string> = new Set()): HomePost[] {
  return newestFirst(blog)
    .filter((p) => !exclude.has(p.slug))
    .slice(0, NEWS_COUNT)
    .map((p) => withLabels(blog, p));
}
