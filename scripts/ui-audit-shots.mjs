// Screenshots for the round 7 UI audit. Usage: node scripts/ui-audit-shots.mjs [baseUrl] [outDir]
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://127.0.0.1:5500";
const OUT = process.argv[3] ?? "../audit7";
mkdirSync(OUT, { recursive: true });

const SHOTS = [
  ["home-scholarships-390.png", "/", 390, "section[aria-labelledby=scholarships-heading]"],
  ["home-scholarships-1440.png", "/", 1440, "section[aria-labelledby=scholarships-heading]"],
  ["home-stories-390.png", "/", 390, "section[aria-labelledby=stories-heading]"],
  ["home-stories-1440.png", "/", 1440, "section[aria-labelledby=stories-heading]"],
  ["home-news-390.png", "/", 390, "section[aria-labelledby=news-heading]"],
  ["home-news-1440.png", "/", 1440, "section[aria-labelledby=news-heading]"],
  ["blog-390.png", "/blog", 390, null],
  ["blog-768.png", "/blog", 768, null],
  ["blog-1440.png", "/blog", 1440, null],
  ["blog-category-impact-stories-390.png", "/blog/categories/impact-stories", 390, null],
  ["apply-rows-393.png", "/apply", 393, "dl"],
  ["apply-top-393.png", "/apply", 393, null],
  ["scholarship-general-8-393.png", "/general-8", 393, null],
  ["post-youas-shaleem-393.png", "/post/a-dream-come-true-youas-shaleem-s-story", 393, null],
];

const browser = await chromium.launch();
for (const [name, path, width, sel] of SHOTS) {
  const page = await browser.newPage({ viewport: { width, height: width < 700 ? 852 : 900 } });
  await page.goto(BASE + path, { waitUntil: "load" });
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 50));
    }
  });
  await page.waitForTimeout(900);
  if (sel) {
    // Hide the sticky header so it does not cover the element capture.
    await page.addStyleTag({ content: "header { visibility: hidden !important; }" });
    await page.locator(sel).first().screenshot({ path: join(OUT, name) });
  } else {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT, name), fullPage: !name.includes("-top-") });
  }
  await page.close();
  console.log("saved", join(OUT, name));
}
await browser.close();
