import { z } from "zod";

export const eventItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  status: z.enum(["draft", "published"]).default("published"),
  images: z
    .array(z.object({ src: z.string().min(1), alt: z.string().default("") }))
    .optional(),
});

export const eventsCollectionSchema = z.object({
  version: z.literal(1),
  updatedAt: z.string().optional(),
  items: z.array(eventItemSchema),
}).superRefine((value, ctx) => {
  const ids = new Set<string>();
  value.items.forEach((item, index) => {
    if (ids.has(item.id)) {
      ctx.addIssue({ code: "custom", path: ["items", index, "id"], message: `Duplicate event id: ${item.id}` });
    }
    ids.add(item.id);
  });
});

export type EventItem = z.infer<typeof eventItemSchema>;
export type EventsCollection = z.infer<typeof eventsCollectionSchema>;

export function parseEventsCollection(data: unknown): EventsCollection {
  return eventsCollectionSchema.parse(data);
}
