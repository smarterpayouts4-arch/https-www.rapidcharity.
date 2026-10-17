import { expect, test } from "@playwright/test";

const PAGES = [
  "/",
  "/about-us",
  "/reports",
  "/apply",
  "/apply/form",
  "/donate",
  "/events",
  "/blog",
  "/education-scholarships1",
  "/general-8",
  "/robert-mathais-scholarship",
  "/ivy-azariah-scholarship",
];

test("desktop nav, dropdown, skip link, and active state", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const skip = page.locator("a.skip-link");
  await expect(skip).toHaveAttribute("href", "#main");
  await expect(page.locator("#main")).toHaveCount(1);
  await expect(page.locator("header a[aria-label='RAPID Charity home']")).toHaveAttribute("href", "/");
  await expect(page.locator("footer a[href='/']").first()).toBeVisible();

  const programs = page.getByRole("button", { name: "Scholarship Programs" });
  await programs.hover();
  const john = page.getByRole("link", { name: "John-Ivy Azariah Scholarship" });
  await expect(john).toBeVisible();

  await programs.click();
  await expect(programs).toHaveAttribute("aria-expanded", "true");
  await programs.click();
  await expect(programs).toHaveAttribute("aria-expanded", "false");

  await programs.focus();
  await programs.press("ArrowDown");
  await expect(john).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(programs).toBeFocused();
  await expect(programs).toHaveAttribute("aria-expanded", "false");

  await programs.press("ArrowDown");
  await expect(john).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Robert Mathais Scholarship" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Ivy Azariah Scholarship", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(programs).toBeFocused();

  await page.goto("/about-us", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "About Us" }).first()).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "Home", exact: true }).first()).not.toHaveAttribute("aria-current", "page");

  const menuId = await programs.getAttribute("aria-controls");
  expect(menuId).toBeTruthy();
  await expect(page.locator(`[id="${menuId}"]`)).toHaveCount(1);

  await page.goto("/general-8", { waitUntil: "domcontentloaded" });
  await expect(programs).toHaveAttribute("aria-current", "true");
  await programs.hover();
  await expect(page.getByRole("link", { name: "John-Ivy Azariah Scholarship", exact: true })).toHaveAttribute("aria-current", "page");

  await page.goto("/post/giving-back-moving-forward-rapid-charity-launches-alumni-network", { waitUntil: "domcontentloaded" });
  await expect(page.locator("header").getByRole("link", { name: "News" })).toHaveAttribute("aria-current", "page");

  await page.goto("/education-scholarships1", { waitUntil: "domcontentloaded" });
  await expect(page.locator("header").getByRole("link", { name: "Apply", exact: true })).toHaveAttribute("aria-current", "page");

  await page.goto("/donate", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Donate" }).first()).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "Back to Apply" })).toHaveCount(0);
});

test("mobile menu locks scroll, lists every link, and closes on navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const toggle = page.getByRole("button", { name: "Open menu" });
  await toggle.click();
  await expect(page.locator("#mobile-drawer")).toHaveAttribute("data-open", "true");
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");

  const nav = page.locator("#mobile-drawer");
  for (const label of ["Home", "About Us", "Reports", "Apply", "Events", "News", "Donate"]) {
    await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
  }
  await nav.getByRole("button", { name: "Scholarship Programs" }).click();
  for (const label of ["John-Ivy Azariah Scholarship", "Robert Mathais Scholarship", "Ivy Azariah Scholarship"]) {
    await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
  }

  await page.keyboard.press("Escape");
  await expect(page.locator("#mobile-drawer")).toHaveAttribute("data-open", "false");
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");
  await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();

  await page.getByRole("button", { name: "Open menu" }).click();
  await nav.getByRole("link", { name: "About Us", exact: true }).click();
  await expect(page).toHaveURL(/\/about-us$/);
  await expect(page.locator("#mobile-drawer")).toHaveAttribute("data-open", "false");
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(nav.getByRole("link", { name: "About Us", exact: true })).toHaveAttribute("aria-current", "page");
});

test("internal links resolve and the unknown route is a 404", async ({ page }) => {
  const missing = await page.goto("/this-page-is-not-real", { waitUntil: "domcontentloaded" });
  expect(missing?.status()).toBe(404);
  await expect(page.getByRole("link", { name: /home/i }).first()).toBeVisible();

  const origin = new URL(page.url()).origin;
  const queue = [...PAGES];
  const seen = new Set<string>();
  const failures: string[] = [];

  while (queue.length) {
    const path = queue.shift()!;
    if (seen.has(path)) continue;
    seen.add(path);
    const response = await page.goto(path, { waitUntil: "domcontentloaded" });
    if (!response || response.status() !== 200) failures.push(`${path} ${response?.status()}`);
    const hrefs = await page.locator("a[href]").evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href") || ""));
    for (const href of hrefs) {
      if (href === "#" || href === "") {
        failures.push(`hash-only on ${path}`);
        continue;
      }
      if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("http")) continue;
      const url = new URL(href, origin);
      if (url.origin !== origin) continue;
      if (href.startsWith("#")) {
        const id = href.slice(1);
        const exists = await page.locator(`[id="${id}"]`).count();
        if (!exists) failures.push(`missing target ${href} on ${path}`);
        continue;
      }
      if (/\.(pptx|pdf|png|jpe?g|webp|gif|svg|mp4|ico|zip)$/i.test(url.pathname)) {
        if (!seen.has(url.pathname)) {
          seen.add(url.pathname);
          const asset = await page.request.get(url.pathname);
          if (asset.status() !== 200) failures.push(`${url.pathname} ${asset.status()}`);
        }
        continue;
      }
      const next = `${url.pathname}${url.search}`;
      if (!seen.has(url.pathname) && !queue.includes(url.pathname)) queue.push(url.pathname);
      if (url.search && !seen.has(next)) queue.push(next);
    }
  }

  expect(failures, failures.join("\n")).toEqual([]);
  expect(seen.has("/education-scholarships1")).toBeTruthy();
  expect(seen.has("/apply")).toBeTruthy();
});
