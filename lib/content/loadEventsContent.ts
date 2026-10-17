import { cache } from "react";
import { parseEventsCollection, type EventItem, type EventsCollection } from "./eventsSchema";
import { readCollection } from "./repository";

const loadCached = cache(async (preview: boolean): Promise<EventsCollection> => {
  return parseEventsCollection(await readCollection("events", preview ? "draft" : "published"));
});

export async function loadEventsContent({ preview = false }: { preview?: boolean } = {}): Promise<EventsCollection> {
  return loadCached(preview);
}

export async function loadDraftEventsContent(): Promise<EventsCollection> {
  return loadEventsContent({ preview: true });
}

export function visibleEvents(collection: EventsCollection, preview = false): EventItem[] {
  return collection.items.filter((item) => preview || item.status === "published");
}
