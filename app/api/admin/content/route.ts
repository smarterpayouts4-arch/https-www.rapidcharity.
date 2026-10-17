import { createCollectionHandlers } from "@/lib/admin/handlers";
import { parseSiteContent } from "@/lib/content/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createCollectionHandlers({
  name: "site",
  parse: parseSiteContent,
  draftLabel: "content/site.draft.json",
  publishedLabel: "content/site.json",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
