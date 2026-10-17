import type { Metadata } from "next";
import Link from "next/link";
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
        <div className="container card-grid">
          {list.map((post) => (
            <article key={post.slug} className="card">
              <h3>
                <Link href={`/post/${post.slug}`}>{post.title}</Link>
              </h3>
              <p className="meta">{post.date}</p>
              <p>{post.excerpt}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
