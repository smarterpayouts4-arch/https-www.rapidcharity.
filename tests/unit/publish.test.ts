import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { publishFiles } from "../../lib/content/localStore";
import { publishDocumentPair, stampForPublish } from "../../lib/content/publish";

test("stampForPublish sets updatedAt without dropping fields", () => {
  const stamped = stampForPublish({ version: 1, title: "News" }, "2026-10-16T00:00:00.000Z");
  assert.deepEqual(stamped, { version: 1, title: "News", updatedAt: "2026-10-16T00:00:00.000Z" });
});

test("Firestore publish commit writes draft and published together", () => {
  const body = publishDocumentPair("rapid-test", "blog", "blogDraft", '{"ok":true}\n', "2026-10-16T00:00:00.000Z");
  assert.equal(body.writes.length, 2);
  assert.equal(body.writes[0]?.update.fields.json.stringValue, body.writes[1]?.update.fields.json.stringValue);
  assert.match(body.writes[0]?.update.name ?? "", /\/cms\/blog$/);
  assert.match(body.writes[1]?.update.name ?? "", /\/cms\/blogDraft$/);
  assert.deepEqual(body.writes[0]?.updateMask.fieldPaths, ["json", "updatedAt"]);
});

test("local publish replaces draft and published with the same bytes", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rapid-publish-"));
  const draft = join(dir, "blog.draft.json");
  const published = join(dir, "blog.json");
  const contents = `${JSON.stringify({ version: 1, updatedAt: "2026-10-16T00:00:00.000Z" }, null, 2)}\n`;
  await publishFiles(draft, published, contents);
  assert.equal(await readFile(draft, "utf8"), contents);
  assert.equal(await readFile(published, "utf8"), contents);
  const leftovers = (await readdir(dir)).filter((name) => name.endsWith(".tmp"));
  assert.deepEqual(leftovers, []);
});
