import { createCollectionHandlers } from "@/lib/admin/handlers";
import { parseBlogCollection } from "@/lib/content/blogSchema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createCollectionHandlers({
  name: "blog",
  parse: parseBlogCollection,
  draftLabel: "content/blog.draft.json",
  publishedLabel: "content/blog.json",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
