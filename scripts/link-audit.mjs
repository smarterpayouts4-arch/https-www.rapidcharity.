#!/usr/bin/env node
import { writeFileSync, mkdirSync } from "fs";

const BASE = process.env.AUDIT_BASE || "http://127.0.0.1:5000";

const ROUTES = [
  "/",
  "/about-us",
  "/apply",
  "/donate",
  "/reports",
  "/blog",
  "/events",
  "/education-scholarships1",
  "/general-8",
  "/robert-mathais-scholarship",
  "/ivy-azariah-scholarship",
  "/form",
  "/copy-of-apply-1",
  "/copy-of-john-ivy-form",
  "/admin",
  "/?preview=1",
  "/about-us?preview=1",
  "/apply?preview=1",
  "/donate?preview=1",
  "/reports?preview=1",
  "/blog?preview=1",
  "/events?preview=1",
  "/education-scholarships1?preview=1",
  "/general-8?preview=1",
  "/robert-mathais-scholarship?preview=1",
  "/ivy-azariah-scholarship?preview=1",
];

async function fetchStatus(path) {
  const url = `${BASE}${path}`;
  try {
    const res = await fetch(url, { redirect: "manual" });
    return { path, status: res.status, ok: res.status >= 200 && res.status < 400 };
  } catch (e) {
    return { path, status: 0, ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function collectInternalHrefs(path) {
  const url = `${BASE}${path}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const html = await res.text();
    const hrefs = new Set();
    const re = /href=["'](\/[^"'#?]*)/g;
    let m;
    while ((m = re.exec(html))) {
      const href = m[1].split("?")[0].split("#")[0];
      if (href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/_next/")) hrefs.add(href);
    }
    return [...hrefs];
  } catch {
    return [];
  }
}

const results = [];
for (const path of ROUTES) results.push(await fetchStatus(path));

const hrefSet = new Set();
for (const path of ["/", "/about-us", "/apply", "/donate", "/reports", "/blog", "/events"]) {
  for (const h of await collectInternalHrefs(path)) hrefSet.add(h);
}

const hrefResults = [];
for (const href of [...hrefSet].sort()) hrefResults.push(await fetchStatus(href));

const brokenRoutes = results.filter((r) => !r.ok);
const brokenHrefs = hrefResults.filter((r) => !r.ok);

mkdirSync("docs/qa", { recursive: true });
const md = `# Link audit — Phase 2

Generated against \`${BASE}\` (box local server).

## Public route status

| Path | Status | OK |
| --- | --- | --- |
${results.map((r) => `| \`${r.path}\` | ${r.status}${r.error ? ` (${r.error})` : ""} | ${r.ok ? "✅" : "❌"} |`).join("\n")}

## Internal hrefs discovered on key pages

Checked ${hrefResults.length} unique internal paths linked from home/about/apply/donate/reports/blog/events.

| Path | Status | OK |
| --- | --- | --- |
${hrefResults.map((r) => `| \`${r.path}\` | ${r.status} | ${r.ok ? "✅" : "❌"} |`).join("\n")}

## Summary

- Routes checked: **${results.length}** — broken: **${brokenRoutes.length}**
- Internal hrefs checked: **${hrefResults.length}** — broken: **${brokenHrefs.length}**
${brokenRoutes.length || brokenHrefs.length ? `\n### Broken\n${[...brokenRoutes, ...brokenHrefs].map((r) => `- \`${r.path}\` → ${r.status}`).join("\n")}` : "\nNo broken routes or internal hrefs found on audited surfaces."}

## Notes

- PayPal donate CTA stays an **external** link (\`paypalHref\` in content) — not audited as internal.
- Legacy form routes (\`/form\`, \`/copy-of-*\`) left out of admin; may still appear if linked.
- Preview routes use \`?preview=1\` and load \`content/site.draft.json\`.
`;

writeFileSync("docs/qa/link-audit-phase2.md", md);
console.log(md);
console.log("broken routes", brokenRoutes.length, "broken hrefs", brokenHrefs.length);
