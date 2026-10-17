import type { MetadataRoute } from "next";
import { loadBlogContent, loadEventsContent, loadSiteContent } from "@/lib/content";
import { site } from "@/lib/site";

/** Rendered per request so lastModified follows the latest admin publish. */
export const dynamic = "force-dynamic";

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

function stamp(value: string | undefined, fallback: Date): Date {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : fallback;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [siteContent, blog, events] = await Promise.all([
    loadSiteContent(),
    loadBlogContent(),
    loadEventsContent(),
  ]);
  const now = new Date();
  const siteUpdated = stamp(siteContent.updatedAt, now);
  const blogUpdated = stamp(blog.updatedAt, siteUpdated);
  const eventsUpdated = stamp(events.updatedAt, siteUpdated);
  const routeStamp: Record<string, Date> = { "/blog": blogUpdated, "/events": eventsUpdated };

  const pages = STATIC_ROUTES.map((path) => ({
    url: `${site.url}${path || "/"}`,
    lastModified: routeStamp[path] ?? siteUpdated,
  }));
  const posts = blog.posts
    .filter((post) => post.status === "published")
    .map((post) => ({
      url: `${site.url}/post/${post.slug}`,
      lastModified: post.date ? new Date(post.date) : blogUpdated,
    }));
  const categories = blog.categories.map((category) => ({
    url: `${site.url}/blog/categories/${category.slug}`,
    lastModified: blogUpdated,
  }));
  const tags = blog.tags.map((tag) => ({
    url: `${site.url}/blog/tags/${tag.slug}`,
    lastModified: blogUpdated,
  }));
  return [...pages, ...posts, ...categories, ...tags];
}
