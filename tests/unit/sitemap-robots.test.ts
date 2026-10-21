import assert from "node:assert/strict";
import test from "node:test";
import sitemap from "../../app/sitemap";
import robots from "../../app/robots";
import { site } from "../../lib/site";

const FORBIDDEN_PATH_FRAGMENTS = [
  "/admin",
  "/api/",
  "/apply/reupload",
  "?preview=",
  "?demo=",
  "/api/dev/",
];

test("sitemap lists canonical public URLs without duplicates", async () => {
  const entries = await sitemap();
  const urls = entries.map((entry) => entry.url);
  assert.ok(urls.length > 0);
  assert.equal(new Set(urls).size, urls.length);
  for (const url of urls) {
    assert.ok(url.startsWith(site.url), url);
    for (const fragment of FORBIDDEN_PATH_FRAGMENTS) {
      assert.ok(!url.includes(fragment), `${url} must not include ${fragment}`);
    }
  }
  assert.ok(urls.some((url) => url === site.url || url === `${site.url}/`));
  assert.ok(urls.some((url) => url.endsWith("/blog")));
});

test("robots allows public crawl and points to the canonical sitemap", () => {
  const rules = robots();
  assert.equal(rules.sitemap, `${site.url}/sitemap.xml`);
  const rule = Array.isArray(rules.rules) ? rules.rules[0] : rules.rules;
  assert.equal(rule?.userAgent, "*");
  assert.deepEqual(rule?.allow, "/");
  const disallow = rule?.disallow ?? [];
  const blocked = Array.isArray(disallow) ? disallow : [disallow];
  assert.ok(blocked.some((item) => String(item).startsWith("/admin")));
  assert.ok(blocked.some((item) => String(item).startsWith("/api/")));
  assert.ok(blocked.some((item) => String(item).includes("/apply/reupload")));
});
