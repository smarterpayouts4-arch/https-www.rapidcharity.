import { createCollectionHandlers } from "@/lib/admin/handlers";
import { parseEventsCollection } from "@/lib/content/eventsSchema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createCollectionHandlers({
  name: "events",
  parse: parseEventsCollection,
  draftLabel: "content/events.draft.json",
  publishedLabel: "content/events.json",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
