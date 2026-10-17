import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:5000";
const OUT = path.join("docs", "audits", "handover-artifacts");
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

const OVERFLOW_PATHS = ["/", "/about-us", "/blog", "/apply", "/donate", "/admin"];
const SHOT_PATHS = [
  { path: "/", name: "home" },
  { path: "/about-us", name: "about-us" },
  { path: "/apply", name: "apply" },
  { path: "/donate", name: "donate" },
  { path: "/reports", name: "reports" },
  { path: "/events", name: "events" },
  { path: "/blog", name: "blog" },
  { path: "/admin", name: "admin" },
  { path: "/education-scholarships1", name: "education-scholarships1" },
  { path: "/general-8", name: "general-8" },
  { path: "/robert-mathais-scholarship", name: "robert-mathais" },
  { path: "/ivy-azariah-scholarship", name: "ivy-azariah" },
  { path: "/post/scholarship-applications-for-spring-2027-semester-open-now", name: "post-spring-2027" },
  { path: "/post/from-scholarship-to-success-the-inspiring-journey-of-ashar-nadeem", name: "post-ashar" },
  { path: "/post/giving-back-moving-forward-rapid-charity-launches-alumni-network", name: "post-alumni" },
  { path: "/post/rapid-charity-hosts-educational-seminar-on-css-and-pms-competitive-exams", name: "post-css-pms" },
  { path: "/post/a-dream-come-true-youas-shaleem-s-story", name: "post-youas" },
];

async function gotoSafe(page, url) {
  // Abort large video to avoid hanging the tab while still confirming DOM.
  await page.route("**/*rapid.mp4*", (route) => route.abort());
  await page.route("**/*umeed-e-nau.mp4*", (route) => route.abort());
  const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(250);
  return res;
}

const browser = await chromium.launch({ headless: true });
const overflow = [];
const pageNotes = [];

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({ viewport: vp });
  const page = await context.newPage();
  for (const p of OVERFLOW_PATHS) {
    try {
      const res = await gotoSafe(page, BASE + p);
      const ox = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const brokenImgs = await page.evaluate(() =>
        [...document.images]
          .filter((img) => img.complete && img.naturalWidth === 0)
          .map((img) => img.currentSrc || img.src)
          .slice(0, 5)
      );
      overflow.push({
        path: p,
        viewport: `${vp.width}x${vp.height}`,
        status: res?.status() ?? 0,
        overflowPx: ox,
        ok: ox <= 8,
        brokenImages: brokenImgs,
      });
      console.log(`overflow ${p} @ ${vp.width}: ${ox}px`);
    } catch (err) {
      overflow.push({
        path: p,
        viewport: `${vp.width}x${vp.height}`,
        status: 0,
        overflowPx: null,
        ok: false,
        error: String(err.message || err),
        brokenImages: [],
      });
      console.log(`FAIL overflow ${p} @ ${vp.width}: ${err.message}`);
    }
  }
  await context.close();
}

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
for (const item of SHOT_PATHS) {
  try {
    const res = await gotoSafe(page, BASE + item.path);
    const shot = path.join(OUT, `${item.name}-1440x900.png`);
    await page.screenshot({ path: shot, fullPage: false });
    const headings = await page.evaluate(() =>
      [...document.querySelectorAll("h1,h2")]
        .slice(0, 20)
        .map((el) => `${el.tagName}:${el.textContent.trim().replace(/\s+/g, " ").slice(0, 120)}`)
    );
    const videos = await page.evaluate(() =>
      [...document.querySelectorAll("video[src], video source[src], video")]
        .map((el) => el.getAttribute("src") || "")
        .filter(Boolean)
    );
    const embeds = await page.evaluate(() => [...document.querySelectorAll("iframe")].map((el) => el.src).slice(0, 3));
    const brandPrimary = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--color-brand-primary").trim()
    );
    const fonts = await page.evaluate(() => {
      const styles = getComputedStyle(document.documentElement);
      return {
        sans: styles.getPropertyValue("--font-sans").trim(),
        serif: styles.getPropertyValue("--font-serif").trim(),
      };
    });
    pageNotes.push({
      path: item.path,
      name: item.name,
      status: res?.status() ?? 0,
      screenshot: shot.replace(/\\/g, "/"),
      headings,
      videos,
      embeds,
      brandPrimary,
      fonts,
    });
    console.log(`shot ${item.name} status=${res?.status()} headings=${headings.length}`);
  } catch (err) {
    pageNotes.push({ path: item.path, name: item.name, status: 0, error: String(err.message || err) });
    console.log(`FAIL shot ${item.name}: ${err.message}`);
  }
}

await page.setViewportSize({ width: 390, height: 844 });
for (const item of [
  { path: "/", name: "home" },
  { path: "/apply", name: "apply" },
  { path: "/admin", name: "admin" },
]) {
  try {
    await gotoSafe(page, BASE + item.path);
    await page.screenshot({ path: path.join(OUT, `${item.name}-390x844.png`), fullPage: false });
  } catch (err) {
    console.log(`FAIL mobile shot ${item.name}: ${err.message}`);
  }
}

await page.setViewportSize({ width: 1440, height: 900 });
await gotoSafe(page, BASE + "/reports");
const reports = await page.evaluate(() => {
  const anchors = [...document.querySelectorAll("a")].map((a) => ({
    href: a.getAttribute("href") || "",
    text: a.textContent.trim().replace(/\s+/g, " ").slice(0, 80),
  }));
  const download = anchors.find((a) => /\.pptx/i.test(a.href) || /download/i.test(a.text));
  const iframe = document.querySelector("iframe");
  return {
    downloadHref: download?.href || null,
    downloadText: download?.text || null,
    iframeSrc: iframe?.src || null,
    pptxAnchors: anchors.filter((a) => /\.pptx/i.test(a.href)),
  };
});

await gotoSafe(page, BASE + "/admin");
const adminTabs = await page.evaluate(() =>
  [...document.querySelectorAll("button")]
    .map((b) => b.textContent.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .slice(0, 80)
);
const adminBanner = await page.evaluate(() => /Local only/i.test(document.body.innerText));
const blogCountHint = await page.evaluate(() => {
  const text = document.body.innerText;
  return {
    hasNewsPosts: /News posts/i.test(text),
    hasEventsList: /Events list/i.test(text),
  };
});

// Direct asset HEAD without abort
const api = await browser.newContext();
const req = await api.request.get(BASE + "/assets/videos/rapid.mp4", { timeout: 20000 });
const pptx = await api.request.get(BASE + "/assets/documents/report-2025.pptx", { timeout: 20000 });
// Don't download whole video — abort after headers if possible; status is enough
const videoStatus = req.status();
const pptxStatus = pptx.status();
await api.close();

const summary = {
  generatedAt: new Date().toISOString(),
  base: BASE,
  overflowFailures: overflow.filter((r) => !r.ok),
  overflowPassCount: overflow.filter((r) => r.ok).length,
  overflowTotal: overflow.length,
  overflow,
  pageNotes,
  reports,
  adminTabs,
  adminBanner,
  blogCountHint,
  videoStatus,
  pptxStatus,
};
fs.writeFileSync(path.join(OUT, "overflow-and-pages.json"), JSON.stringify(summary, null, 2));
console.log(
  JSON.stringify(
    {
      overflowPass: summary.overflowPassCount,
      overflowTotal: summary.overflowTotal,
      overflowFailures: summary.overflowFailures,
      videoStatus,
      pptxStatus,
      adminBanner,
      pagesShot: pageNotes.filter((p) => p.status).length,
      reports,
      brandSample: pageNotes.find((p) => p.brandPrimary)?.brandPrimary,
      fontsSample: pageNotes.find((p) => p.fonts)?.fonts,
    },
    null,
    2,
  ),
);
await browser.close();
