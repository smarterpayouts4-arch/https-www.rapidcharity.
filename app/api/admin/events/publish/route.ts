import { createPublishHandler } from "@/lib/admin/handlers";
import { parseEventsCollection } from "@/lib/content/eventsSchema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createPublishHandler({
  name: "events",
  parse: parseEventsCollection,
  publishedLabel: "content/events.json",
});

export const POST = handlers.POST;
