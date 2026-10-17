import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

const OUT = path.resolve("../qa/wix-refs");
const VIEWPORTS = [
  [390, 844],
  [1280, 800],
];
const ROUTES = [
  ["home", "https://www.rapidcharity.org/"],
  ["about-us", "https://www.rapidcharity.org/about-us"],
  ["apply", "https://www.rapidcharity.org/apply"],
  ["donate", "https://www.rapidcharity.org/donate"],
  ["blog", "https://www.rapidcharity.org/blog"],
  ["events", "https://www.rapidcharity.org/events"],
  ["general-8", "https://www.rapidcharity.org/general-8"],
  ["ivy-azariah-scholarship", "https://www.rapidcharity.org/ivy-azariah-scholarship"],
  ["robert-mathais-scholarship", "https://www.rapidcharity.org/robert-mathais-scholarship"],
  [
    "post-css-pms-seminar",
    "https://www.rapidcharity.org/post/rapid-charity-hosts-educational-seminar-on-css-and-pms-competitive-exams",
  ],
  [
    "post-alumni-network",
    "https://www.rapidcharity.org/post/giving-back-moving-forward-rapid-charity-launches-alumni-network",
  ],
  [
    "post-spring-2027-apps",
    "https://www.rapidcharity.org/post/scholarship-applications-for-spring-2027-semester-open-now",
  ],
  [
    "post-ashar-nadeem",
    "https://www.rapidcharity.org/post/from-scholarship-to-success-the-inspiring-journey-of-ashar-nadeem",
  ],
  [
    "post-human-rights",
    "https://www.rapidcharity.org/post/10-december-universal-declaration-of-human-rights",
  ],
  ["category-announcement", "https://www.rapidcharity.org/blog/categories/announcement"],
  ["category-impact-stories", "https://www.rapidcharity.org/blog/categories/impact-stories"],
];

const browser = await chromium.launch();
const page = await browser.newPage();

for (const [w, h] of VIEWPORTS) {
  const dir = path.join(OUT, `${w}x${h}`);
  fs.mkdirSync(dir, { recursive: true });
  await page.setViewportSize({ width: w, height: h });
  for (const [name, url] of ROUTES) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
      await page.waitForTimeout(1800);
      const file = path.join(dir, `${name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log("wrote", file);
    } catch (e) {
      console.error("fail", name, w, h, e.message);
    }
  }
}

await browser.close();
console.log("wix done");
