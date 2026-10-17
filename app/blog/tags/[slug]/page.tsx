import type { Metadata } from "next";
import { PostCard, PostGrid } from "@/components/blog/PostCard";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { PreviewBanner } from "@/components/PreviewBanner";
import {
  getBlogPostsByTag,
  loadBlogContent,
  loadSiteContent,
  resolvePreview,
} from "@/lib/content";
import { site } from "@/lib/site";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateStaticParams() {
  return (await loadBlogContent()).tags.map((tag) => ({ slug: tag.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const collection = await loadBlogContent();
  const tag = collection.tags.find((item) => item.slug === slug);
  return {
    title: tag?.label ?? "Tag",
    description: tag ? `${tag.label} stories from RAPID Charity.` : "News tag",
    alternates: tag
      ? { canonical: `${site.url}/blog/tags/${tag.slug}` }
      : undefined,
  };
}

export default async function TagPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : undefined;
  const preview = await resolvePreview(query);
  const siteContent = await loadSiteContent({ preview });
  const collection = await loadBlogContent({ preview });
  const tag = collection.tags.find((item) => item.slug === slug);
  if (!tag) notFound();
  const list = [...getBlogPostsByTag(collection, slug, preview)].sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  return (
    <>
      {preview ? <PreviewBanner content={siteContent.chrome.preview} liveHref={`/blog/tags/${slug}`} /> : null}
      <PageHero title={tag.label} subtitle={siteContent.chrome.blog.tagSubtitle} />
      <section className="section">
        <div className="container">
          <PostGrid variant="page">
            {list.map((post, index) => (
              <PostCard
                key={post.slug}
                post={post}
                categoryLabels={post.categories.map(
                  (item) => collection.categories.find((c) => c.slug === item)?.label ?? item,
                )}
                minReadSuffix={siteContent.chrome.blog.minReadSuffix}
                sizes="(max-width: 639px) 50vw, (max-width: 1279px) 33vw, 25vw"
                priority={index < 2}
              />
            ))}
          </PostGrid>
        </div>
      </section>
    </>
  );
}
