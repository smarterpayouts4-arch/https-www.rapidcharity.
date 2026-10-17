import { cache } from "react";
import { parseBlogCollection, type BlogCollection, type BlogPost } from "./blogSchema";
import { readCollection } from "./repository";

const loadCached = cache(async (preview: boolean): Promise<BlogCollection> => {
  return parseBlogCollection(await readCollection("blog", preview ? "draft" : "published"));
});

export async function loadBlogContent({ preview = false }: { preview?: boolean } = {}): Promise<BlogCollection> {
  return loadCached(preview);
}

export async function loadDraftBlogContent(): Promise<BlogCollection> {
  return loadBlogContent({ preview: true });
}

export function visiblePosts(collection: BlogCollection, preview = false): BlogPost[] {
  return collection.posts.filter((post) => preview || post.status === "published");
}

export function getPost(collection: BlogCollection, slug: string, preview = false) {
  return visiblePosts(collection, preview).find((post) => post.slug === slug);
}

export function getPostsByCategory(collection: BlogCollection, slug: string, preview = false) {
  return visiblePosts(collection, preview).filter((post) => post.categories.includes(slug));
}

export function getPostsByTag(collection: BlogCollection, slug: string, preview = false) {
  return visiblePosts(collection, preview).filter((post) => post.tags.includes(slug));
}

export function getRecentPosts(
  collection: BlogCollection,
  excludeSlug?: string,
  limit = 3,
  preview = false,
) {
  return visiblePosts(collection, preview)
    .filter((post) => post.slug !== excludeSlug)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}
