import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { DEFAULT_OG_IMAGE, resolveSiteOrigin, rootSiteMetadata } from "../../lib/site/shareMetadata";
import { site } from "../../lib/site";

test("default OG image file is present under public/", () => {
  const file = path.join(process.cwd(), "public", DEFAULT_OG_IMAGE.path.replace(/^\//, "").replace(/\//g, path.sep));
  assert.ok(existsSync(file), file);
});

test("root metadata uses the approved OG image and Twitter large card", () => {
  const metadata = rootSiteMetadata();
  const og = metadata.openGraph;
  assert.ok(og && typeof og === "object" && !Array.isArray(og));
  const ogRecord = og as Record<string, unknown>;
  assert.equal(ogRecord.type, "website");
  assert.equal(ogRecord.url, resolveSiteOrigin());
  assert.equal(ogRecord.siteName, site.name);
  const images = ogRecord.images;
  assert.ok(images);
  const first = Array.isArray(images) ? images[0] : images;
  assert.ok(first && typeof first === "object" && "url" in first);
  assert.equal(String(first.url), DEFAULT_OG_IMAGE.path);
  assert.equal(first.width, DEFAULT_OG_IMAGE.width);
  assert.equal(first.height, DEFAULT_OG_IMAGE.height);
  assert.equal(first.alt, DEFAULT_OG_IMAGE.alt);

  const twitter = metadata.twitter;
  assert.ok(twitter && typeof twitter === "object");
  const twitterRecord = twitter as Record<string, unknown>;
  assert.equal(twitterRecord.card, "summary_large_image");
  assert.deepEqual(twitterRecord.images, [DEFAULT_OG_IMAGE.path]);
  assert.equal(metadata.metadataBase?.toString(), `${resolveSiteOrigin()}/`);
});

test("OG image public URL resolves against metadataBase", () => {
  const metadata = rootSiteMetadata();
  const base = metadata.metadataBase ?? new URL(resolveSiteOrigin());
  const absolute = new URL(DEFAULT_OG_IMAGE.path, base);
  assert.equal(absolute.href, `${resolveSiteOrigin()}${DEFAULT_OG_IMAGE.path}`);
});

test("resolveSiteOrigin prefers Vercel deployment host when built on Vercel", () => {
  const prevVercel = process.env.VERCEL;
  const prevUrl = process.env.VERCEL_URL;
  const prevProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const prevPublic = process.env.NEXT_PUBLIC_SITE_URL;
  delete process.env.NEXT_PUBLIC_SITE_URL;
  process.env.VERCEL = "1";
  process.env.VERCEL_PROJECT_PRODUCTION_URL = "rapidcharity.vercel.app";
  process.env.VERCEL_URL = "rapidcharity-git-main-smarterpayouts4-arch.vercel.app";
  try {
    assert.equal(resolveSiteOrigin(), "https://rapidcharity.vercel.app");
  } finally {
    if (prevVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = prevVercel;
    if (prevUrl === undefined) delete process.env.VERCEL_URL;
    else process.env.VERCEL_URL = prevUrl;
    if (prevProd === undefined) delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    else process.env.VERCEL_PROJECT_PRODUCTION_URL = prevProd;
    if (prevPublic === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = prevPublic;
  }
});

test("existing favicon remains at app/icon.png", () => {
  assert.ok(existsSync(path.join(process.cwd(), "app", "icon.png")));
});
