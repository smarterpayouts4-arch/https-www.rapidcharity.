"use client";

import { useMemo, useState } from "react";
import type { BlogCollection, BlogPost } from "@/lib/content";
import styles from "@/app/admin/admin.module.css";
import { Field } from "../Field";

type Props = {
  collection: BlogCollection;
  onChange: (next: BlogCollection) => void;
  busy: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
  status: string;
  statusKind: "ok" | "err" | "";
};

function emptyPost(): BlogPost {
  return {
    slug: "",
    title: "",
    date: new Date().toISOString().slice(0, 10),
    author: "Communication Desk",
    readMinutes: 2,
    categories: ["announcement"],
    tags: ["impact"],
    excerpt: "",
    image: "",
    imageAlt: "",
    body: "",
    status: "draft",
  };
}

export function BlogCollectionSection({
  collection,
  onChange,
  busy,
  onSaveDraft,
  onPublish,
  status,
  statusKind,
}: Props) {
  const sorted = useMemo(
    () =>
      [...collection.posts].sort((a, b) => b.date.localeCompare(a.date)),
    [collection.posts],
  );
  const [selectedSlug, setSelectedSlug] = useState(sorted[0]?.slug ?? "");
  const selected =
    collection.posts.find((post) => post.slug === selectedSlug) ?? sorted[0] ?? null;

  const updatePost = (slug: string, patch: Partial<BlogPost>) => {
    onChange({
      ...collection,
      posts: collection.posts.map((post) =>
        post.slug === slug ? { ...post, ...patch } : post,
      ),
    });
    if (patch.slug && patch.slug !== slug) setSelectedSlug(patch.slug);
  };

  const addPost = () => {
    const draft = emptyPost();
    draft.slug = `draft-post-${collection.posts.length + 1}`;
    draft.title = "New post";
    onChange({ ...collection, posts: [draft, ...collection.posts] });
    setSelectedSlug(draft.slug);
  };

  return (
    <>
      <section className={styles.card}>
        <h2>News collection</h2>
        <p className={styles.cardLead}>
          Edits write <code>content/blog.draft.json</code>. Publish copies that file to{" "}
          <code>content/blog.json</code>. Existing image paths under{" "}
          <code>public/assets/images/blog/</code> are preserved.
        </p>
        <div className={styles.actions} style={{ marginBottom: "0.75rem" }}>
          <button type="button" className={styles.btnGhost} onClick={addPost}>
            Add post
          </button>
          <button
            type="button"
            className={styles.btn}
            disabled={busy}
            onClick={onSaveDraft}
          >
            Save blog draft
          </button>
          <button
            type="button"
            className={styles.btnDanger}
            disabled={busy}
            onClick={onPublish}
          >
            Publish blog
          </button>
        </div>
        <p
          className={`${styles.status} ${
            statusKind === "ok"
              ? styles.statusOk
              : statusKind === "err"
                ? styles.statusErr
                : ""
          }`}
          role="status"
        >
          {status || `${collection.posts.length} posts · draft/publish separate from site chrome`}
        </p>
      </section>

      <section className={styles.card}>
        <h2>Select post</h2>
        <div className={styles.field}>
          <label htmlFor="blog-post-select">Post</label>
          <select
            id="blog-post-select"
            value={selected?.slug ?? ""}
            onChange={(event) => setSelectedSlug(event.target.value)}
          >
            {sorted.map((post) => (
              <option key={post.slug} value={post.slug}>
                {post.date} · {post.title}
              </option>
            ))}
          </select>
        </div>
      </section>

      {selected ? (
        <section className={styles.card}>
          <h2>{selected.title || "Untitled post"}</h2>
          <div className={styles.row2}>
            <Field
              label="Title"
              value={selected.title}
              onChange={(value) => updatePost(selected.slug, { title: value })}
            />
            <Field
              label="Slug"
              value={selected.slug}
              mono
              onChange={(value) => updatePost(selected.slug, { slug: value })}
            />
          </div>
          <div className={styles.row2}>
            <Field
              label="Date"
              value={selected.date}
              onChange={(value) => updatePost(selected.slug, { date: value })}
            />
            <Field
              label="Author"
              value={selected.author}
              onChange={(value) => updatePost(selected.slug, { author: value })}
            />
          </div>
          <div className={styles.row2}>
            <Field
              label="Read minutes"
              value={String(selected.readMinutes)}
              onChange={(value) =>
                updatePost(selected.slug, {
                  readMinutes: Number.parseInt(value, 10) || 1,
                })
              }
            />
            <div className={styles.field}>
              <label htmlFor="post-status">Status</label>
              <select
                id="post-status"
                value={selected.status}
                onChange={(event) =>
                  updatePost(selected.slug, {
                    status: event.target.value as BlogPost["status"],
                  })
                }
              >
                <option value="published">published</option>
                <option value="draft">draft</option>
              </select>
            </div>
          </div>
          <Field
            label="Categories (comma-separated slugs)"
            value={selected.categories.join(", ")}
            onChange={(value) =>
              updatePost(selected.slug, {
                categories: value
                  .split(",")
                  .map((part) => part.trim())
                  .filter(Boolean),
              })
            }
          />
          <Field
            label="Tags (comma-separated slugs)"
            value={selected.tags.join(", ")}
            onChange={(value) =>
              updatePost(selected.slug, {
                tags: value
                  .split(",")
                  .map((part) => part.trim())
                  .filter(Boolean),
              })
            }
          />
          <Field
            label="Excerpt"
            multiline
            value={selected.excerpt}
            onChange={(value) => updatePost(selected.slug, { excerpt: value })}
          />
          <Field
            label="Image path"
            mono
            value={selected.image ?? ""}
            onChange={(value) =>
              updatePost(selected.slug, { image: value || undefined })
            }
          />
          <Field
            label="Image alt"
            value={selected.imageAlt ?? ""}
            onChange={(value) =>
              updatePost(selected.slug, { imageAlt: value || undefined })
            }
          />
          <Field
            label="Body"
            multiline
            value={selected.body}
            onChange={(value) => updatePost(selected.slug, { body: value })}
          />
        </section>
      ) : null}
    </>
  );
}
