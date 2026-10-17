import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseBlogCollection } from "../../lib/content/blogSchema";
import { parseEventsCollection } from "../../lib/content/eventsSchema";
import { parseSiteContent } from "../../lib/content/schema";

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

test("published site, blog, and events JSON match their schemas", () => {
  const site = parseSiteContent(readJson("content/site.json"));
  const blog = parseBlogCollection(readJson("content/blog.json"));
  const events = parseEventsCollection(readJson("content/events.json"));
  assert.equal(site.verified.scholarshipsAwarded, "147");
  assert.ok(blog.posts.length >= 27);
  assert.equal(events.items.length, 6);
  assert.equal(site.missionOverview.video.embedUrl, "");
});

test("blog schema rejects duplicate slugs", () => {
  const blog = parseBlogCollection(readJson("content/blog.json"));
  const duplicate = structuredClone(blog);
  duplicate.posts.push({ ...duplicate.posts[0] });
  assert.throws(() => parseBlogCollection(duplicate), /Duplicate post slug/);
});

test("events schema rejects duplicate ids", () => {
  const events = parseEventsCollection(readJson("content/events.json"));
  const duplicate = structuredClone(events);
  duplicate.items.push({ ...duplicate.items[0] });
  assert.throws(() => parseEventsCollection(duplicate), /Duplicate event id/);
});

test("blog schema rejects unknown categories", () => {
  const blog = parseBlogCollection(readJson("content/blog.json"));
  const broken = structuredClone(blog);
  broken.posts[0] = { ...broken.posts[0], categories: ["not-a-real-category"] };
  assert.throws(() => parseBlogCollection(broken), /Unknown category/);
});
