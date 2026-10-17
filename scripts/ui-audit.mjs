// Responsive UI audit: overflow, clipped text, broken images, hidden reveals, homepage links.
// Usage: node scripts/ui-audit.mjs [baseUrl] [outDir]
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://127.0.0.1:5500";
const OUT = process.argv[3] ?? "../audit7";
const WIDTHS = [360, 375, 390, 393, 412, 430, 768, 820, 1024, 1280, 1440];
const ONLY = process.env.AUDIT_ROUTES ? process.env.AUDIT_ROUTES.split(",") : null;
const ONLY_W = process.env.AUDIT_WIDTHS ? process.env.AUDIT_WIDTHS.split(",").map(Number) : null;
mkdirSync(OUT, { recursive: true });

async function routes() {
  const xml = await (await fetch(`${BASE}/sitemap.xml`)).text();
  const list = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  return [...new Set(list)];
}

async function scrollThrough(page) {
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(window.innerHeight * 0.6));
    for (let y = 0; y <= document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, document.documentElement.scrollHeight);
    await new Promise((r) => setTimeout(r, 300));
  });
  await page.waitForTimeout(700);
}

const CHECK = () => {
  const vw = document.documentElement.clientWidth;
  const out = { hOverflow: 0, clipped: [], offRight: [], ellipsis: [], hidden: [], broken: [] };
  out.hOverflow = Math.max(0, document.documentElement.scrollWidth - vw);
  const label = (el) => {
    const cls = typeof el.className === "string" ? el.className.split(" ")[0] : "";
    const t = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 50);
    return `${el.tagName.toLowerCase()}${cls ? "." + cls : ""} "${t}"`;
  };
  const isRendered = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
    }
    return true;
  };
  const inScroller = (el) => {
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (/(auto|scroll)/.test(cs.overflowX) && n.scrollWidth > n.clientWidth) return true;
    }
    return false;
  };
  const inClosedUi = (el) =>
    !!el.closest('[aria-hidden="true"], .sr-only, .skip-link, [inert], dialog:not([open])');
  const all = document.querySelectorAll("main *, header *, footer *");
  for (const el of all) {
    if (["SCRIPT", "STYLE", "NOSCRIPT", "IFRAME", "VIDEO"].includes(el.tagName) || el instanceof SVGElement) continue;
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!isRendered(el) || inClosedUi(el)) continue;
    const cs = getComputedStyle(el);
    if (hasText) {
      const clips = cs.overflowX !== "visible";
      if (clips && el.scrollWidth > el.clientWidth + 1 && !/(auto|scroll)/.test(cs.overflowX)) out.clipped.push(label(el));
      if (cs.textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth + 1) out.ellipsis.push(label(el));
      if (cs.webkitLineClamp && cs.webkitLineClamp !== "none" && el.scrollHeight > el.clientHeight + 2)
        out.ellipsis.push("clamp " + label(el));
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 && !inScroller(el) && cs.position !== "fixed") out.offRight.push(label(el));
    }
    if (parseFloat(cs.opacity) < 0.05 && (hasText || el.tagName === "IMG" || el.matches("[data-reveal],[data-reveal-item]"))) {
      out.hidden.push(label(el));
    }
    if (el.tagName === "IMG" && el.complete && el.naturalWidth === 0 && el.getAttribute("src")) out.broken.push(el.getAttribute("src"));
  }
  return out;
};

const results = [];
const browser = await chromium.launch();
const list = ONLY ?? (await routes());
for (const width of ONLY_W ?? WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 700 ? 852 : 900 } });
  const page = await ctx.newPage();
  const bad = [];
  // Same-origin images only: the Facebook video embed makes its own tracking requests.
  page.on("response", (r) => {
    if (r.request().resourceType() === "image" && r.status() >= 400 && r.url().startsWith(BASE)) bad.push(`${r.status()} ${r.url()}`);
  });
  for (const path of list) {
    bad.length = 0;
    await page.goto(BASE + path, { waitUntil: "load" });
    await scrollThrough(page);
    // Checked at the bottom, after scrolling through: every reveal must have fired.
    const r = await page.evaluate(CHECK);
    r.broken.push(...bad);
    results.push({ width, path, ...r });
  }
  await ctx.close();
}

// Homepage links and blog grid columns
const extra = {};
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "load" });
  extra.homeSeeAll = await page.evaluate(() =>
    [...document.querySelectorAll("main section")].map((s) => {
      const h = s.querySelector("h2");
      const links = [...s.querySelectorAll("a")].filter((a) => /see all/i.test(a.textContent || ""));
      return links.length ? { section: h?.id || h?.textContent?.trim(), seeAll: links.map((a) => a.getAttribute("href")) } : null;
    }).filter(Boolean),
  );
  extra.scholarshipCards = await page.evaluate(() =>
    [...document.querySelectorAll("section[aria-labelledby=scholarships-heading] article")].map((a) => ({
      title: a.querySelector("h3")?.textContent, href: a.querySelector("a")?.getAttribute("href"), img: a.querySelector("img")?.getAttribute("src") ?? null,
    })),
  );
  extra.newsNav = await page.evaluate(() => [...document.querySelectorAll("header a")].filter((a) => a.textContent.trim() === "News").map((a) => a.getAttribute("href")));
  await page.goto(BASE + "/blog", { waitUntil: "load" });
  extra.blogColumnsAt390 = await page.evaluate(() => {
    const cards = [...document.querySelectorAll("main article")];
    const rowTop = Math.round(cards[1]?.getBoundingClientRect().top ?? -1);
    return cards.filter((c) => Math.round(c.getBoundingClientRect().top) === rowTop).length;
  });
  // /apply/form: hydrates and advances past the first step.
  try {
    await page.goto(BASE + "/apply/form?scholarship=john-ivy-azariah", { waitUntil: "load" });
    await page.locator("form[data-hydrated='true']").waitFor({ timeout: 15000 });
    const formOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await page.getByRole("radio", { name: /^New$/ }).check();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("heading", { name: "Personal", level: 2 }).waitFor({ timeout: 10000 });
    extra.applyForm = { hydrated: true, advancedToPersonal: true, hOverflowAt390: formOverflow };
  } catch (error) {
    extra.applyForm = { ok: false, error: String(error).slice(0, 300) };
  }
  await ctx.close();
}
await browser.close();

const fmt = (key) => results.filter((r) => r[key].length).map((r) => `${r.width} ${r.path}: ${r[key].join(" | ")}`);
const summary = {
  checked: results.length,
  hOverflow: results.filter((r) => r.hOverflow > 0).map((r) => `${r.width} ${r.path} +${r.hOverflow}px`),
  clipped: fmt("clipped"),
  offRight: fmt("offRight"),
  ellipsis: fmt("ellipsis"),
  hidden: fmt("hidden"),
  broken: fmt("broken"),
  extra,
};
writeFileSync(join(OUT, "audit-results.json"), JSON.stringify({ summary, results }, null, 2));
console.log(JSON.stringify(summary, null, 2));
