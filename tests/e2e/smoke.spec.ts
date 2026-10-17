import { expect, test } from "@playwright/test";

const PRIMARY_ROUTES = [
  "/",
  "/about-us",
  "/apply",
  "/donate",
  "/blog",
  "/events",
  "/general-8",
  "/ivy-azariah-scholarship",
  "/robert-mathais-scholarship",
];

const SAMPLE_POST =
  "/post/rapid-charity-hosts-educational-seminar-on-css-and-pms-competitive-exams";

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

test.describe("legacy and author urls redirect", () => {
  const redirects: Array<[string, string]> = [
    ["/form", "/apply"],
    ["/scholarship-form", "/apply"],
    ["/copy-of-apply-1", "/general-8"],
    ["/copy-of-john-ivy-form", "/robert-mathais-scholarship"],
    ["/announcements", "/blog"],
    ["/donation-thank-you-page", "/donate"],
    ["/profile/azher-adil/profile", "/blog"],
  ];

  for (const [from, to] of redirects) {
    test(`${from} redirects to ${to}`, async ({ request }) => {
      const response = await request.get(from, { maxRedirects: 0 });
      expect([301, 308]).toContain(response.status());
      const location = response.headers().location ?? "";
      expect(location.endsWith(to) || location.includes(`${to}?`) || location === to).toBeTruthy();
    });
  }
});

test.describe("primary routes load", () => {
  for (const path of PRIMARY_ROUTES) {
    test(`loads ${path}`, async ({ page }) => {
      const res = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(res?.ok()).toBeTruthy();
      await expect(page.locator("header")).toBeVisible();
      await expect(page.locator("footer")).toBeVisible();
    });
  }

  test("sample blog post loads", async ({ page }) => {
    const res = await page.goto(SAMPLE_POST, { waitUntil: "domcontentloaded" });
    expect(res?.ok()).toBeTruthy();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("blog index lists posts", async ({ page }) => {
    await page.goto("/blog", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "News" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Blog categories" })).toBeVisible();
    await expect(page.locator("a[href^='/post/']").first()).toBeVisible();
  });

  test("404 for unknown route", async ({ page }) => {
    const res = await page.goto("/this-route-should-not-exist-xyz", {
      waitUntil: "domcontentloaded",
    });
    expect(res?.status()).toBe(404);
    await expect(page.getByText(/not found/i)).toBeVisible();
  });
});

test.describe("navigation", () => {
  test("primary nav links resolve", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.setViewportSize({ width: 1440, height: 900 });
    const nav = page.locator("nav[aria-label='Primary']");
    await expect(nav.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    await expect(nav.getByRole("link", { name: "About Us" })).toHaveAttribute(
      "href",
      "/about-us",
    );
    await expect(nav.getByRole("link", { name: "Apply" })).toHaveAttribute("href", "/apply");
    await expect(nav.getByRole("link", { name: "Events" })).toHaveAttribute("href", "/events");
    await expect(nav.getByRole("link", { name: "News" })).toHaveAttribute("href", "/blog");
    await expect(nav.getByRole("link", { name: "Donate" })).toHaveAttribute("href", "/donate");
  });
});

test.describe("external apply/donate hrefs (no submit)", () => {
  test("apply page scholarship form links", async ({ page }) => {
    await page.goto("/apply", { waitUntil: "domcontentloaded" });
    const links = page.locator("a.text-link[href*='/apply?scholarship=']");
    await expect(links).toHaveCount(3);
    const hrefs = await links.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")));
    expect(hrefs).toEqual([
      "/apply?scholarship=john-ivy-azariah",
      "/apply?scholarship=robert-mathias",
      "/apply?scholarship=ivy-azariah",
    ]);
    for (let i = 0; i < 3; i++) {
      expect(await links.nth(i).getAttribute("target")).toBeNull();
    }
    await expect(page.locator("a[href*='docs.google.com/forms']")).toHaveCount(0);
  });

  test("donate PayPal link", async ({ page }) => {
    await page.goto("/donate", { waitUntil: "domcontentloaded" });
    const donate = page.locator("a.text-link[href*='paypal.com']").first();
    await expect(donate).toBeVisible();
    await expect(donate).toHaveText(/PLEASE DONATE/i);
    const href = await donate.getAttribute("href");
    expect(href).toContain("hosted_button_id=EDMX8GB44KF4N");
    expect(await donate.getAttribute("target")).toBe("_blank");
  });
});

test.describe("responsive smoke", () => {
  for (const vp of VIEWPORTS) {
    test(`home ok at ${vp.width}x${vp.height}`, async ({ page }) => {
      await page.setViewportSize(vp);
      const res = await page.goto("/", { waitUntil: "domcontentloaded" });
      expect(res?.ok()).toBeTruthy();
      await expect(page.locator("header")).toBeVisible();
      // no horizontal overflow beyond 2px tolerance
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth - doc.clientWidth;
      });
      expect(overflow).toBeLessThanOrEqual(8);
    });
  }
});

test.describe("categories and additional posts", () => {
  const CATEGORIES = [
    "/blog/categories/announcement",
    "/blog/categories/event",
    "/blog/categories/impact-stories",
    "/blog/categories/rapid-alumni",
  ];

  for (const path of CATEGORIES) {
    test(`category loads ${path}`, async ({ page }) => {
      const res = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(res?.ok()).toBeTruthy();
      await expect(page.locator("header")).toBeVisible();
      await expect(page.locator("a[href^='/post/']").first()).toBeVisible();
    });
  }

  const MORE_POSTS = [
    "/post/scholarship-applications-for-spring-2027-semester-open-now",
    "/post/from-scholarship-to-success-the-inspiring-journey-of-ashar-nadeem",
    "/post/giving-back-moving-forward-rapid-charity-launches-alumni-network",
  ];

  for (const path of MORE_POSTS) {
    test(`post loads ${path}`, async ({ page }) => {
      const res = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(res?.ok()).toBeTruthy();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByRole("list", { name: "Share Buttons" })).toBeVisible();
    });
  }
});

test.describe("apply page chrome", () => {
  test("share row and deadline band", async ({ page }) => {
    await page.goto("/apply", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Share:", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Share:" })).toHaveCount(0);
    await expect(page.getByRole("list", { name: "Share Buttons" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Spring Semester 2027" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Fall Semester 2027" })).toBeVisible();
    const band = page.locator('[aria-label="Application deadlines"]');
    await expect(band).toBeVisible();
  });

  test("apply CTAs are underlined text links not pills", async ({ page }) => {
    await page.goto("/apply", { waitUntil: "domcontentloaded" });
    const links = page.locator("a.text-link[href*='/apply?scholarship=']");
    await expect(links).toHaveCount(3);
    await expect(page.locator("a.btn[href*='/apply']")).toHaveCount(0);
    await expect(page.locator("a.btn[href*='docs.google.com/forms']")).toHaveCount(0);
  });

  test("application form preselects a scholarship and reports a missing answer", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/apply?scholarship=ivy-azariah", { waitUntil: "domcontentloaded" });
    await expect(page.locator("form[data-hydrated='true']")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Scholarship application" })).toBeVisible();
    await expect(page.getByText("Applying for: Ivy Azariah")).toBeVisible();
    await expect(page.getByRole("radio", { name: /^Ivy Azariah/ })).toHaveCount(0);
    await expect(page.locator("aside ol")).toBeHidden();
    await expect(page.getByText("Step 1 of 8 · Scholarship")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    const alert = page.locator("[data-form-issues]");
    await expect(alert).toContainText("New or Continuing applicant");
    await expect(alert).toContainText("Choose New or Continuing.");
    await expect(page.getByText("Fix the highlighted fields")).toHaveCount(0);
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth - doc.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(8);
  });
});

test.describe("sample post featured image + share", () => {
  test("featured image, H2s, category rail, recent posts, share", async ({ page }) => {
    await page.goto(
      "/post/rapid-charity-hosts-educational-seminar-on-css-and-pms-competitive-exams",
      { waitUntil: "domcontentloaded" },
    );
    await expect(page.locator("article figure img")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Blog categories" })).toBeVisible();
    await expect(page.getByRole("link", { name: "All Posts" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Introduction & Overview", level: 2 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Looking Forward", level: 2 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent Posts", level: 2 })).toBeVisible();
    await expect(page.getByRole("list", { name: "Share Buttons" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Share Buttons" }).getByRole("link", { name: "Facebook" })).toBeVisible();
  });
});

test.describe("additional post body", () => {
  test("alumni network post has H2s and recent posts rail", async ({ page }) => {
    await page.goto(
      "/post/giving-back-moving-forward-rapid-charity-launches-alumni-network",
      { waitUntil: "domcontentloaded" },
    );
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Introduction & Overview", level: 2 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Looking Ahead", level: 2 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent Posts", level: 2 })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Blog categories" })).toBeVisible();
  });
});

test.describe("donate page chrome", () => {
  test("hero title, share row, and thank-you band", async ({ page }) => {
    await page.goto("/donate", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "YOU ARE EDUCATING" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /DEAR\s+FRIENDS/i })).toBeVisible();
    await expect(page.getByRole("list", { name: "Share Buttons" })).toBeVisible();
    await expect(page.getByText(/Team RAPID/i).first()).toBeVisible();
    await expect(page.locator("a.btn[href*='paypal.com']")).toHaveCount(0);
  });
});

test.describe("header chrome", () => {
  test("active nav highlight and scholarship chevron indicator", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/donate", { waitUntil: "domcontentloaded" });
    const donate = page.locator("header a[aria-current='page']").first();
    await expect(donate).toHaveText("Donate");
    const sch = page.locator("nav[aria-label='Primary'] button", { hasText: "Scholarship Programs" });
    await expect(sch.locator("svg")).toHaveCount(1);
  });
});

test.describe("enriched posts and home report", () => {
  test("spring 2027 apps post has scholarship H2 and ordered list", async ({ page }) => {
    await page.goto(
      "/post/scholarship-applications-for-spring-2027-semester-open-now",
      { waitUntil: "domcontentloaded" },
    );
    await expect(page.getByRole("heading", { name: "Three Scholarship Programs", level: 2 })).toBeVisible();
    await expect(page.locator("article ol li").first()).toBeVisible();
  });

  test("human rights post lists UDHR articles", async ({ page }) => {
    await page.goto(
      "/post/10-december-universal-declaration-of-human-rights",
      { waitUntil: "domcontentloaded" },
    );
    await expect(page.getByRole("heading", { name: "Key Articles of the UDHR", level: 2 })).toBeVisible();
    await expect(page.locator("article ul li").first()).toBeVisible();
  });

  test("premium homepage core sections", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Education Empowers Brighter Futures/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Investing in Bright Minds/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /What.?s Happening at RAPID Charity/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Make Education Possible/i })).toBeVisible();
    await expect(page.getByText("147")).toBeVisible();
    await expect(page.locator('a[href="/apply"]').first()).toBeVisible();
    await expect(page.locator('a[href="/donate"]').first()).toBeVisible();
  });

  test("blog cards show category chips", async ({ page }) => {
    await page.goto("/blog", { waitUntil: "domcontentloaded" });
    await expect(page.locator("article").first()).toBeVisible();
    await expect(page.getByText("Announcements").first()).toBeVisible();
  });
});
