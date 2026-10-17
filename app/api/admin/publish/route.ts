import { createPublishHandler } from "@/lib/admin/handlers";
import { parseSiteContent } from "@/lib/content/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createPublishHandler({
  name: "site",
  parse: parseSiteContent,
  publishedLabel: "content/site.json",
});

export const POST = handlers.POST;
