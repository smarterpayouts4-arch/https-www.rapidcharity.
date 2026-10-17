import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const OUT = path.resolve("../qa/local-refs");
const VIEWPORTS = [
  [360, 800],
  [390, 844],
  [430, 932],
  [768, 1024],
  [1024, 768],
  [1280, 800],
  [1440, 900],
  [1920, 1080],
];
const ROUTES = [
  ["home", "/"],
  ["about-us", "/about-us"],
  ["apply", "/apply"],
  ["donate", "/donate"],
  ["blog", "/blog"],
  ["events", "/events"],
  ["general-8", "/general-8"],
  ["ivy-azariah-scholarship", "/ivy-azariah-scholarship"],
  ["robert-mathais-scholarship", "/robert-mathais-scholarship"],
  ["post-css-pms-seminar", "/post/rapid-charity-hosts-educational-seminar-on-css-and-pms-competitive-exams"],
  ["post-alumni-network", "/post/giving-back-moving-forward-rapid-charity-launches-alumni-network"],
  ["post-spring-2027-apps", "/post/scholarship-applications-for-spring-2027-semester-open-now"],
  ["post-ashar-nadeem", "/post/from-scholarship-to-success-the-inspiring-journey-of-ashar-nadeem"],
  ["post-human-rights", "/post/10-december-universal-declaration-of-human-rights"],
  ["category-announcement", "/blog/categories/announcement"],
  ["category-impact-stories", "/blog/categories/impact-stories"],
];

const browser = await chromium.launch();
const page = await browser.newPage();

for (const [w, h] of VIEWPORTS) {
  const dir = path.join(OUT, `${w}x${h}`);
  fs.mkdirSync(dir, { recursive: true });
  await page.setViewportSize({ width: w, height: h });
  for (const [name, route] of ROUTES) {
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    // collapse sticky flash
    await page.waitForTimeout(300);
    const file = path.join(dir, `${name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log("wrote", file);
  }
}

await browser.close();
console.log("done");
