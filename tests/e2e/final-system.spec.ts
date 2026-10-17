import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { width: 360, height: 800 }, { width: 390, height: 844 },
  { width: 430, height: 932 }, { width: 768, height: 1024 },
  { width: 1024, height: 768 }, { width: 1280, height: 800 },
  { width: 1440, height: 900 }, { width: 1920, height: 1080 },
];

for (const viewport of VIEWPORTS) {
  test(`home and blog have no overflow at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    for (const path of ["/", "/blog"]) {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response?.ok()).toBeTruthy();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} overflow at ${viewport.width}`).toBeLessThanOrEqual(8);
    }
  });
}

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/admin", { waitUntil: "domcontentloaded" });
  const password = process.env.ADMIN_LOCAL_PASSWORD ?? "playwright-local";
  await expect(async () => {
    if ((await page.getByRole("button", { name: "Home", exact: true }).count()) > 0) return;
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("button", { name: "Home", exact: true })).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 20_000 });
}

test("admin API rejects anonymous reads and writes", async ({ request }) => {
  expect((await request.get("/api/admin/content")).status()).toBe(401);
  expect((await request.post("/api/admin/content", { data: { version: 1 } })).status()).toBe(401);
  expect((await request.post("/api/admin/publish", { data: {} })).status()).toBe(401);
  expect((await request.post("/api/admin/blog/publish", { data: {} })).status()).toBe(401);
  expect((await request.post("/api/admin/events/publish", { data: {} })).status()).toBe(401);
});

test("Admin preserves site and collection workflows", async ({ page }) => {
  await signIn(page);
  for (const label of ["Home", "About", "Apply", "Donate", "Reports", "News posts", "Events list", "Shared chrome", "Navigation", "Footer", "Verified facts"])
    await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "News posts", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save blog draft" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish blog" })).toBeVisible();
  await page.getByRole("button", { name: "Events list", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save events draft" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish events" })).toBeVisible();
  await expect(page.getByText(/Signed in as local-admin/i)).toBeVisible();
});

test("Footer logo alt and primary canonicals are present", async ({ page }) => {
  const canonicals: Record<string, string> = {
    "/": "https://www.rapidcharity.org", "/about-us": "https://www.rapidcharity.org/about-us",
    "/apply": "https://www.rapidcharity.org/apply", "/donate": "https://www.rapidcharity.org/donate",
    "/reports": "https://www.rapidcharity.org/reports", "/blog": "https://www.rapidcharity.org/blog",
    "/events": "https://www.rapidcharity.org/events",
  };
  for (const [path, canonical] of Object.entries(canonicals)) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.locator(`link[rel="canonical"]`)).toHaveAttribute("href", canonical);
  }
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("footer img")).toHaveAttribute("alt", "RAPID Charity logo");
});

test("blog and events previews use draft banner", async ({ page }) => {
  await signIn(page);
  for (const path of ["/blog?preview=1", "/events?preview=1"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Draft preview: not published/i)).toBeVisible();
  }
});
