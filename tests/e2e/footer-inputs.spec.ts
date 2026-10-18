import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const SHOTS = "/workspace/rapid-charity/audit13";
mkdirSync(SHOTS, { recursive: true });

async function checkFooter(page: Page, width: number, label: string) {
  await page.setViewportSize({ width, height: width >= 1000 ? 900 : 852 });
  const input = page.locator("#subscribe-email");
  await input.scrollIntoViewIfNeeded();
  const style = await input.evaluate((el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return { bg: cs.backgroundColor, radius: parseFloat(cs.borderTopLeftRadius), height: r.height, fontSize: parseFloat(cs.fontSize), overflow: document.documentElement.scrollWidth - window.innerWidth };
  });
  // White background, small radius (never the 999px pill), 44px+ tall, 16px text, no page overflow
  expect(style.bg, `${label} footer input background`).toBe("rgb(255, 255, 255)");
  expect(style.radius, `${label} footer input radius`).toBeLessThanOrEqual(16);
  expect(style.height, `${label} footer input height`).toBeGreaterThanOrEqual(44);
  expect(style.height, `${label} footer input height`).toBeLessThan(64);
  expect(style.fontSize).toBeGreaterThanOrEqual(16);
  expect(style.overflow).toBeLessThanOrEqual(0);
  await page.locator("footer").screenshot({ path: join(SHOTS, `footer-${label}.png`) });
}

test.describe("footer subscribe input", () => {
  for (const width of [360, 393, 768, 1440]) {
    test(`home footer at ${width}px has no black oval`, async ({ page }) => {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await checkFooter(page, width, `home-${width}`);
    });
  }
  test("inner page footer at 393px", async ({ page }) => {
    await page.goto("/about-us", { waitUntil: "domcontentloaded" });
    await checkFooter(page, 393, "inner-393");
  });
  test("apply form and admin login controls are standard inputs", async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await page.goto("/apply/form?demo=rapid2027", { waitUntil: "domcontentloaded" });
    await expect(page.locator("form[data-hydrated='true']")).toBeVisible();
    await page.screenshot({ path: join(SHOTS, "footer-apply-393.png"), fullPage: true });
    const dark = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("form input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=hidden]), form select, form textarea")]
        .filter((el) => el.offsetParent !== null)
        .map((el) => getComputedStyle(el).backgroundColor)
        .filter((bg) => bg === "rgb(34, 34, 34)" || bg === "rgb(44, 44, 44)"),
    );
    expect(dark).toEqual([]);
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await page.screenshot({ path: join(SHOTS, "footer-admin-393.png"), fullPage: true });
  });
});
