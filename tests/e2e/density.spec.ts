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

test("mobile home uses a two-column story grid, full program cards, and see all", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  for (const id of ["#news-heading", "#stories-heading"]) {
    const section = page.locator(id).locator("xpath=ancestor::section[1]");
    await section.locator("article").first().scrollIntoViewIfNeeded();
    // Layout offsets, so the fade-in translate cannot skew the measurement.
    const m = await section.evaluate((el) => {
      const [a, b] = [...el.querySelectorAll("article")] as HTMLElement[];
      const imgOffset = a.querySelector("img")!.getBoundingClientRect().top - a.getBoundingClientRect().top;
      return { aTop: a.offsetTop, bTop: b.offsetTop, aRight: a.offsetLeft + a.offsetWidth, bLeft: b.offsetLeft, imgOffset };
    });
    // Two cards side by side, photo on top of each card.
    expect(Math.abs(m.aTop - m.bTop)).toBeLessThan(2);
    expect(m.bLeft).toBeGreaterThan(m.aRight - 1);
    expect(Math.abs(m.imgOffset)).toBeLessThan(3);
  }
  const programs = page.locator("#scholarships-heading").locator("xpath=ancestor::section[1]").locator("article");
  await expect(programs).toHaveCount(3);
  const programBox = await programs.first().boundingBox();
  expect(programBox?.width ?? 999).toBeLessThanOrEqual(352);
  await expect(page.getByRole("link", { name: "See all" }).first()).toBeVisible();
});

test("how to apply steps use a short lead-in", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/education-scholarships1", { waitUntil: "domcontentloaded" });
  // Original wording restored from rapidcharity.org (content audit, round 6).
  await expect(page.getByText(/Start the application if you are in the process of deciding/)).toBeVisible();
  const step = page.getByRole("listitem").filter({ hasText: "Fill out the Pre-Qualification Form" });
  await expect(step).toBeVisible();
  await expect(step.locator("strong")).toBeVisible();
  await expect(page.getByText(/direct reimbursement of payment to the professional institution/)).toBeVisible();
});
