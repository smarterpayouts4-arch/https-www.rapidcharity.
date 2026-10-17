import { createPublishHandler } from "@/lib/admin/handlers";
import { parseBlogCollection } from "@/lib/content/blogSchema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createPublishHandler({
  name: "blog",
  parse: parseBlogCollection,
  publishedLabel: "content/blog.json",
});

export const POST = handlers.POST;
