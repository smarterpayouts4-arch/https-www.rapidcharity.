import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryRail } from "@/components/CategoryRail";
import { PreviewBanner } from "@/components/PreviewBanner";
import { RecentPosts } from "@/components/RecentPosts";
import { ShareRow } from "@/components/ShareRow";
import {
  getBlogPost,
  getBlogRecentPosts,
  loadBlogContent,
  loadSiteContent,
  resolvePreview,
  visiblePosts,
} from "@/lib/content";
import { renderPostBody } from "@/lib/renderPostBody";
import { site } from "@/lib/site";
import styles from "./post.module.css";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateStaticParams() {
  return visiblePosts(await loadBlogContent()).map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(await loadBlogContent(), slug);
  return {
    title: post?.title ?? "Post",
    description: post?.excerpt,
    alternates: post ? { canonical: `${site.url}/post/${post.slug}` } : undefined,
  };
}

export default async function PostPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : undefined;
  const preview = await resolvePreview(query);
  const siteContent = await loadSiteContent({ preview });
  const collection = await loadBlogContent({ preview });
  const post = getBlogPost(collection, slug, preview);
  if (!post) notFound();
  const shareUrl = `${site.url}/post/${post.slug}`;
  const recent = getBlogRecentPosts(collection, post.slug, 3, preview);
  const primaryCategory = post.categories[0] ?? null;
  const labels = siteContent.chrome.blog;

  return (
    <>
      {preview ? <PreviewBanner content={siteContent.chrome.preview} liveHref={`/post/${post.slug}`} /> : null}
      <CategoryRail
        activeSlug={primaryCategory}
        categories={collection.categories}
        labels={labels}
      />
      <article className={`section ${styles.article}`}>
        <div className={`container ${styles.wrap}`}>
          <p className="meta">
            <Link className="tap-link" href="/blog">{labels.backLabel}</Link>
          </p>
          <h1 className={styles.title}>{post.title}</h1>
          <p className={`meta ${styles.meta}`}>
            {post.author} · {formatDate(post.date)} · {post.readMinutes}{" "}
            {labels.minReadSuffix}
          </p>

          {post.image ? (
            <figure className={styles.featured}>
              <Image
                src={post.image}
                alt={post.imageAlt || post.title}
                width={960}
                height={480}
                className={styles.featuredImg}
                priority
              />
            </figure>
          ) : null}

          <div className={`prose ${styles.body}`}>{renderPostBody(post.body)}</div>

          <ShareRow content={siteContent.chrome.share} url={shareUrl} title={post.title} variant="compact" />

          <RecentPosts
            posts={recent}
            title={labels.recentPostsTitle}
            seeAllLabel={labels.seeAllLabel}
          />
        </div>
      </article>
    </>
  );
}

function formatDate(iso: string) {
  const date = new Date(`${iso}T12:00:00`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
