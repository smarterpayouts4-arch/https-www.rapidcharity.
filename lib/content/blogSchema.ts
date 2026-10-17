import { z } from "zod";

export const blogTaxonomySchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  label: z.string().min(1),
});

export const blogPostSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1),
  date: z.iso.date(),
  author: z.string().min(1),
  readMinutes: z.number().int().positive(),
  categories: z.array(z.string().min(1)).min(1),
  tags: z.array(z.string().min(1)),
  excerpt: z.string().min(1),
  image: z.string().min(1).optional(),
  imageAlt: z.string().min(1).optional(),
  body: z.string().min(1),
  status: z.enum(["draft", "published"]).default("published"),
});

export const blogCollectionSchema = z.object({
  version: z.literal(1),
  updatedAt: z.string().optional(),
  categories: z.array(blogTaxonomySchema).min(1),
  tags: z.array(blogTaxonomySchema),
  posts: z.array(blogPostSchema),
}).superRefine((value, ctx) => {
  const categorySlugs = new Set(value.categories.map((item) => item.slug));
  const tagSlugs = new Set(value.tags.map((item) => item.slug));
  const postSlugs = new Set<string>();
  value.posts.forEach((post, index) => {
    if (postSlugs.has(post.slug)) ctx.addIssue({ code: "custom", path: ["posts", index, "slug"], message: `Duplicate post slug: ${post.slug}` });
    postSlugs.add(post.slug);
    post.categories.forEach((slug) => {
      if (!categorySlugs.has(slug)) ctx.addIssue({ code: "custom", path: ["posts", index, "categories"], message: `Unknown category: ${slug}` });
    });
    post.tags.forEach((slug) => {
      if (!tagSlugs.has(slug)) ctx.addIssue({ code: "custom", path: ["posts", index, "tags"], message: `Unknown tag: ${slug}` });
    });
  });
});

export type BlogTaxonomy = z.infer<typeof blogTaxonomySchema>;
export type BlogPost = z.infer<typeof blogPostSchema>;
export type BlogCollection = z.infer<typeof blogCollectionSchema>;
export function parseBlogCollection(data: unknown): BlogCollection { return blogCollectionSchema.parse(data); }
