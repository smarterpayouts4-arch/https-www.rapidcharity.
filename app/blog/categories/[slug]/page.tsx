import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
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
        <div className="container card-grid">
          {list.map((post) => (
            <article key={post.slug} className="card">
              {post.image ? (
                <Link href={`/post/${post.slug}`}>
                  <Image
                    src={post.image}
                    alt={post.imageAlt || post.title}
                    width={480}
                    height={260}
                    style={{
                      width: "100%",
                      height: 160,
                      objectFit: "cover",
                      borderRadius: "0.35rem",
                      marginBottom: "0.75rem",
                    }}
                  />
                </Link>
              ) : null}
              <h3>
                <Link href={`/post/${post.slug}`}>{post.title}</Link>
              </h3>
              <p className="meta">
                {post.author} · {post.date} · {post.readMinutes}{" "}
                {siteContent.chrome.blog.minReadSuffix}
              </p>
              <p>{post.excerpt}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
