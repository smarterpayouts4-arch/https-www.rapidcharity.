#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const base = process.env.AUDIT_BASE ?? "http://127.0.0.1:4721";
const site = JSON.parse(readFileSync("content/site.json", "utf8"));
const blog = JSON.parse(readFileSync("content/blog.json", "utf8"));
const events = JSON.parse(readFileSync("content/events.json", "utf8"));

const staticRoutes = [
  "/", "/about-us", "/apply", "/donate", "/reports", "/blog", "/events",
  "/education-scholarships1", "/general-8", "/robert-mathais-scholarship",
  "/ivy-azariah-scholarship",
];
const redirectRoutes = [
  ["/form", 308],
  ["/copy-of-apply-1", 308],
  ["/copy-of-john-ivy-form", 308],
  ["/profile/azher-adil/profile", 308],
];
const postRoutes = blog.posts.filter((post) => post.status === "published").map((post) => `/post/${post.slug}`);
const categoryRoutes = blog.categories.map((item) => `/blog/categories/${item.slug}`);
const tagRoutes = blog.tags.map((item) => `/blog/tags/${item.slug}`);
const publicRoutes = [...staticRoutes, ...postRoutes, ...categoryRoutes, ...tagRoutes];
const previewRoutes = [
  "/?preview=1", "/about-us?preview=1", "/apply?preview=1", "/donate?preview=1",
  "/reports?preview=1", "/blog?preview=1", "/events?preview=1",
  "/education-scholarships1?preview=1", "/general-8?preview=1",
  "/robert-mathais-scholarship?preview=1", "/ivy-azariah-scholarship?preview=1",
  `${postRoutes[0]}?preview=1`,
];
const adminGetRoutes = [
  ["/admin", 200],
  ["/api/admin/content", 401],
  ["/api/admin/blog", 401],
  ["/api/admin/events", 401],
];

function collectAssets(value, result = new Set()) {
  if (Array.isArray(value)) for (const item of value) collectAssets(item, result);
  else if (value && typeof value === "object") for (const child of Object.values(value)) collectAssets(child, result);
  else if (typeof value === "string" && value.startsWith("/assets/")) result.add(value);
  return result;
}
const assets = [...collectAssets({ site, blog })].sort();
const expectedMissing = new Set(["/assets/videos/rapid.mp4"]);

async function check(path, expected = 200) {
  try {
    const response = await fetch(`${base}${path}`, { redirect: "manual" });
    return { path, status: response.status, expected, ok: response.status === expected };
  } catch (error) {
    return { path, status: 0, expected, ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

const routeResults = [];
for (const path of publicRoutes) routeResults.push(await check(path));
const redirectResults = [];
for (const [path, expected] of redirectRoutes) redirectResults.push(await check(path, expected));
const previewResults = [];
for (const path of previewRoutes) previewResults.push(await check(path));
const adminResults = [];
for (const [path, expected] of adminGetRoutes) adminResults.push(await check(path, expected));
const assetResults = [];
for (const path of assets) assetResults.push(await check(path, expectedMissing.has(path) ? 404 : 200));

const all = [...routeResults, ...redirectResults, ...previewResults, ...adminResults, ...assetResults];
const failures = all.filter((item) => !item.ok);
const report = {
  generatedAt: new Date().toISOString(),
  base,
  counts: {
    staticRoutes: staticRoutes.length,
    postRoutes: postRoutes.length,
    categoryRoutes: categoryRoutes.length,
    tagRoutes: tagRoutes.length,
    publicRoutes: publicRoutes.length,
    previewRoutes: previewRoutes.length,
    adminAndGetApis: adminGetRoutes.length,
    redirects: redirectRoutes.length,
    criticalAssets: assets.length,
    events: events.items.length,
    failures: failures.length,
  },
  expectedMissing: [...expectedMissing],
  routeResults,
  redirectResults,
  previewResults,
  adminResults,
  assetResults,
  failures,
};
mkdirSync("qa", { recursive: true });
writeFileSync("qa/final-system-http.json", `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.counts, null, 2));
console.log("expected missing asset: rapid.mp4 (report-2025.pptx is intentional in public/)");
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}
