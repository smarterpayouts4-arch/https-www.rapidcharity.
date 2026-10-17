import type { Metadata } from "next";
import { BlogSearch } from "@/components/BlogSearch";
import { CategoryRail } from "@/components/CategoryRail";
import { PageHero } from "@/components/PageHero";
import { PreviewBanner } from "@/components/PreviewBanner";
import {
  loadBlogContent,
  loadSiteContent,
  resolvePreview,
  visiblePosts,
} from "@/lib/content";
import { site } from "@/lib/site";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: SearchParams;
}): Promise<Metadata> {
  const params = searchParams ? await searchParams : undefined;
  const preview = await resolvePreview(params);
  const { blog } = await loadSiteContent({ preview });
  return {
    title: blog.title,
    description: blog.subtitle,
    alternates: { canonical: `${site.url}/blog` },
  };
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const params = searchParams ? await searchParams : undefined;
  const preview = await resolvePreview(params);
  const siteContent = await loadSiteContent({ preview });
  const collection = await loadBlogContent({ preview });
  const list = [...visiblePosts(collection, preview)].sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  return (
    <>
      {preview ? <PreviewBanner content={siteContent.chrome.preview} liveHref="/blog" /> : null}
      <CategoryRail
        categories={collection.categories}
        labels={siteContent.chrome.blog}
      />
      <PageHero title={siteContent.blog.title} subtitle={siteContent.blog.subtitle} />
      <section className="section">
        <div className="container">
          <BlogSearch
            posts={list}
            categories={collection.categories}
            labels={siteContent.chrome.blog}
            minReadSuffix={siteContent.chrome.blog.minReadSuffix}
          />
        </div>
      </section>
    </>
  );
}
