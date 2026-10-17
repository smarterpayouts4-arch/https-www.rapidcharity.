import type { Metadata } from "next";
import { PostCard, PostGrid } from "@/components/blog/PostCard";
import { notFound } from "next/navigation";
import { CategoryRail } from "@/components/CategoryRail";
import { PageHero } from "@/components/PageHero";
import { PreviewBanner } from "@/components/PreviewBanner";
import {
  getBlogPostsByCategory,
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
  return (await loadBlogContent()).categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const collection = await loadBlogContent();
  const category = collection.categories.find((item) => item.slug === slug);
  return {
    title: category?.label ?? "Category",
    description: category
      ? `${category.label} news from RAPID Charity.`
      : "News category",
    alternates: category
      ? { canonical: `${site.url}/blog/categories/${category.slug}` }
      : undefined,
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : undefined;
  const preview = await resolvePreview(query);
  const siteContent = await loadSiteContent({ preview });
  const collection = await loadBlogContent({ preview });
  const category = collection.categories.find((item) => item.slug === slug);
  if (!category) notFound();
  const list = [...getBlogPostsByCategory(collection, slug, preview)].sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  return (
    <>
      {preview ? (
        <PreviewBanner content={siteContent.chrome.preview} liveHref={`/blog/categories/${slug}`} />
      ) : null}
      <CategoryRail
        activeSlug={slug}
        categories={collection.categories}
        labels={siteContent.chrome.blog}
      />
      <PageHero
        title={category.label}
        subtitle={siteContent.chrome.blog.categorySubtitle}
      />
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
