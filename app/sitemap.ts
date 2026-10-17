import type { MetadataRoute } from "next";
import blog from "@/content/blog.json";
import { site } from "@/lib/site";

const STATIC_ROUTES = [
  "",
  "/about-us",
  "/reports",
  "/apply",
  "/apply/form",
  "/donate",
  "/events",
  "/blog",
  "/education-scholarships1",
  "/general-8",
  "/robert-mathais-scholarship",
  "/ivy-azariah-scholarship",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages = STATIC_ROUTES.map((path) => ({
    url: `${site.url}${path || "/"}`,
    lastModified: now,
  }));
  const posts = blog.posts
    .filter((post) => post.status !== "hidden")
    .map((post) => ({
      url: `${site.url}/post/${post.slug}`,
      lastModified: post.date ? new Date(post.date) : now,
    }));
  const categories = blog.categories.map((category) => ({
    url: `${site.url}/blog/categories/${category.slug}`,
    lastModified: now,
  }));
  const tags = blog.tags.map((tag) => ({
    url: `${site.url}/blog/tags/${tag.slug}`,
    lastModified: now,
  }));
  return [...pages, ...posts, ...categories, ...tags];
}
