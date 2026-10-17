#!/usr/bin/env node
/** Low-noise schema/Admin/content drift audit across site + collection documents. */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const strict = process.argv.includes("--strict");
const read = (path) => readFileSync(join(root, path), "utf8");
const json = (path) => JSON.parse(read(path));

const published = json("content/site.json");
const draft = json("content/site.draft.json");
const blog = json("content/blog.json");
const blogDraft = json("content/blog.draft.json");
const events = json("content/events.json");
const eventsDraft = json("content/events.draft.json");

function paths(value, prefix = "", result = new Set()) {
  if (Array.isArray(value)) {
    result.add(`${prefix}[]`);
    for (const item of value) paths(item, `${prefix}[]`, result);
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      const next = prefix ? `${prefix}.${key}` : key;
      result.add(next);
      paths(child, next, result);
    }
  }
  return result;
}

function drift(left, right) {
  const leftPaths = paths(left);
  const rightPaths = paths(right);
  return {
    leftCount: leftPaths.size,
    rightCount: rightPaths.size,
    onlyLeft: [...leftPaths].filter((path) => !rightPaths.has(path)),
    onlyRight: [...rightPaths].filter((path) => !leftPaths.has(path)),
  };
}

const siteDrift = drift(published, draft);
const blogDrift = drift(blog, blogDraft);
const eventsDrift = drift(events, eventsDraft);
const managedKeys = [
  "nav", "footer", "chrome", "homepage", "hero", "applicationCard", "missionOverview", "impactStats",
  "scholarshipPrograms", "studentStories", "latestNews", "leadership", "reportsShowcase", "donateBanner",
  "aboutTeaser", "about", "apply", "donate", "reports", "blog", "events", "verified",
];
const contentKeys = Object.keys(published).filter((key) => !["version", "updatedAt"].includes(key));
const adminMissing = contentKeys.filter((key) => !managedKeys.includes(key));
const contentMissing = managedKeys.filter((key) => !contentKeys.includes(key));

const connectedFiles = [
  "app/page.tsx", "app/about-us/page.tsx", "app/apply/page.tsx", "app/donate/page.tsx",
  "app/reports/page.tsx", "app/blog/page.tsx", "app/blog/categories/[slug]/page.tsx",
  "app/blog/tags/[slug]/page.tsx", "app/post/[slug]/page.tsx", "app/events/page.tsx",
  "app/general-8/page.tsx", "app/robert-mathais-scholarship/page.tsx",
  "app/ivy-azariah-scholarship/page.tsx", "app/education-scholarships1/page.tsx",
  "app/not-found.tsx", "components/Header.tsx", "components/Footer.tsx",
  "components/SubscribeForm.tsx", "components/PreviewBanner.tsx", "components/BlogSearch.tsx",
  "components/CategoryRail.tsx", "components/RecentPosts.tsx", "components/home/Hero.tsx",
  "components/home/MissionOverview.tsx", "components/home/ApplicationCard.tsx",
  "components/home/ImpactStats.tsx", "components/home/ScholarshipPrograms.tsx",
  "components/home/StudentStories.tsx", "components/home/LatestNews.tsx",
  "components/home/Leadership.tsx", "components/home/ReportsShowcase.tsx", "components/home/DonateBanner.tsx",
];
const issues = [];
const literalText = /<(?:h[1-6]|p|a|button|label|li|strong|em|cite)[^>]*>\s*([A-Za-z][^<{]*?)\s*<\/(?:h[1-6]|p|a|button|label|li|strong|em|cite)>/g;
const literalProp = /\b(?:alt|aria-label|placeholder|title)=["']([^"']{3,})["']/g;
for (const file of connectedFiles) {
  const full = join(root, file);
  if (!existsSync(full)) {
    issues.push({ type: "missing-connected-file", file });
    continue;
  }
  const source = readFileSync(full, "utf8");
  for (const match of source.matchAll(literalText)) {
    if (/^(Download|View|Apply|Donate|Search|Share|Back|Recent|See|Open|Close|Page|The )/i.test(match[1]))
      issues.push({ type: "hardcoded-visible-text", file, text: match[1].trim() });
  }
  for (const match of source.matchAll(literalProp)) {
    if (match[1] === "true" || match[1] === "false") continue;
    issues.push({ type: "hardcoded-visible-prop", file, text: match[1] });
  }
  for (const match of source.matchAll(/(?:src|poster)=["'](\/assets\/[^"']+)["']/g))
    issues.push({ type: "hardcoded-asset", file, text: match[1] });
}

const schemaFiles = ["common.ts", "chrome.ts", "home.ts", "pages.ts", "verified.ts", "site.ts"];
const schemaText = schemaFiles.map((file) => read(`lib/content/schema/${file}`)).join("\n");
const schemaMissingTopLevel = contentKeys.filter((key) => !new RegExp(`\\b${key}\\s*:`).test(schemaText));
const adminText = read("components/admin/AdminClient.tsx");
const configText = read("components/admin/config.ts");
const adminHasRecursiveEditor = adminText.includes("GroupSection") && read("components/admin/ContentFields.tsx").includes("Object.entries");
const adminHasCollections = adminText.includes("BlogCollectionSection") && adminText.includes("EventsCollectionSection") &&
  configText.includes('"news"') && configText.includes('"events"');

const duplicatePostSlugs = blog.posts.map((post) => post.slug).filter((slug, index, all) => all.indexOf(slug) !== index);
const duplicateEventIds = events.items.map((item) => item.id).filter((id, index, all) => all.indexOf(id) !== index);
const categories = new Set(blog.categories.map((item) => item.slug));
const tags = new Set(blog.tags.map((item) => item.slug));
const unknownCategories = blog.posts.flatMap((post) => post.categories.filter((slug) => !categories.has(slug)).map((slug) => `${post.slug}:${slug}`));
const unknownTags = blog.posts.flatMap((post) => post.tags.filter((slug) => !tags.has(slug)).map((slug) => `${post.slug}:${slug}`));
const missingImageAlt = blog.posts.filter((post) => post.image && !post.imageAlt).map((post) => post.slug);

function localAssets(value, result = new Set()) {
  if (Array.isArray(value)) for (const item of value) localAssets(item, result);
  else if (value && typeof value === "object") for (const child of Object.values(value)) localAssets(child, result);
  else if (typeof value === "string" && value.startsWith("/assets/")) result.add(value);
  return result;
}
const assets = localAssets({ site: published, blog });
const expectedDesktopOnly = new Set([
  "/assets/videos/rapid.mp4",
  "/assets/documents/report-2025.pptx",
]);
const missingAssets = [...assets].filter((asset) => !expectedDesktopOnly.has(asset) && !existsSync(join(root, "public", asset)));
const desktopOnlyMissing = [...expectedDesktopOnly].filter((asset) => assets.has(asset) && !existsSync(join(root, "public", asset)));

const driftFailures = [siteDrift, blogDrift, eventsDrift].some((item) => item.onlyLeft.length || item.onlyRight.length);
const collectionFailures = duplicatePostSlugs.length || duplicateEventIds.length || unknownCategories.length || unknownTags.length || missingImageAlt.length;
const ok = !driftFailures && !adminMissing.length && !contentMissing.length && !schemaMissingTopLevel.length &&
  adminHasRecursiveEditor && adminHasCollections && !issues.length && !collectionFailures && !missingAssets.length &&
  published.footer.logo.alt.trim().length > 0 && draft.footer.logo.alt.trim().length > 0;

const report = {
  ok,
  metrics: {
    sitePaths: siteDrift.leftCount,
    managedTopLevelKeys: managedKeys.length,
    blogPosts: blog.posts.length,
    blogCategories: blog.categories.length,
    blogTags: blog.tags.length,
    eventItems: events.items.length,
    criticalLocalAssets: assets.size,
  },
  drift: { site: siteDrift, blog: blogDrift, events: eventsDrift, adminMissing, contentMissing, schemaMissingTopLevel },
  admin: { adminHasRecursiveEditor, adminHasCollections },
  collections: { duplicatePostSlugs, duplicateEventIds, unknownCategories, unknownTags, missingImageAlt },
  assets: { missingAssets, desktopOnlyMissing },
  issues,
  excludedAsLegacy: ["app/form/page.tsx", "app/copy-of-apply-1/page.tsx", "app/copy-of-john-ivy-form/page.tsx"],
};
console.log(JSON.stringify(report, null, 2));
if (strict && !report.ok) process.exit(1);
