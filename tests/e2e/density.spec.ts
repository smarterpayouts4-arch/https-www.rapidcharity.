import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const WIDTHS = [390, 1440] as const;
const SHOTS = join(process.cwd(), "qa/density-shots");

const PAGES = [
  ["home", "/"],
  ["about", "/about-us"],
  ["apply", "/apply"],
  ["apply-guide", "/education-scholarships1"],
  ["john-ivy", "/general-8"],
  ["robert", "/robert-mathais-scholarship"],
  ["ivy", "/ivy-azariah-scholarship"],
  ["events", "/events"],
  ["news", "/blog"],
  ["post", "/post/scholarship-applications-for-spring-2027-semester-open-now"],
  ["reports", "/reports"],
  ["donate", "/donate"],
] as const;

test.describe.configure({ timeout: 120_000 });

for (const width of WIDTHS) {
  test(`pages at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    mkdirSync(join(SHOTS, String(width)), { recursive: true });
    for (const [name, path] of PAGES) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      await page.screenshot({
        path: join(SHOTS, String(width), `${name}.png`),
        fullPage: true,
      });
    }
  });
}

test("mobile home uses rows, a peeking carousel, and see all", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const news = page.locator("#news-heading").locator("xpath=ancestor::section[1]").locator("article").first();
  await news.scrollIntoViewIfNeeded();
  const row = await news.boundingBox();
  const thumb = await news.locator("img").boundingBox();
  expect(row?.height ?? 999).toBeLessThan(150);
  expect((thumb?.x ?? 0) > (row?.x ?? 0) + (row?.width ?? 0) / 2).toBeTruthy();
  const programs = page.locator("#scholarships-heading").locator("xpath=ancestor::section[1]").locator("article").first();
  const programBox = await programs.boundingBox();
  expect(programBox?.width ?? 999).toBeLessThan(340);
  await expect(page.getByRole("link", { name: "See all" }).first()).toBeVisible();
});

test("how to apply steps use a short lead-in", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/education-scholarships1", { waitUntil: "domcontentloaded" });
  const step = page.getByRole("listitem").filter({ hasText: "Start when you are deciding" });
  await expect(step).toBeVisible();
  await expect(step.locator("strong")).toHaveText("Start when you are deciding on");
  await expect(page.getByText("Aim for top-ranking institutions where possible.")).toBeVisible();
  await expect(page.getByText("Complete the pre-qualification form on the website and submit it.")).toBeVisible();
  await expect(page.getByText(/direct reimbursement of payment to the professional institution/)).toBeVisible();
});
