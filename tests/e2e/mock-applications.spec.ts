import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Sample applicant chips ("Test with a sample applicant").
 *
 * Runs against any server: the private unlock (?demo=rapid2027) works on a
 * production build without env vars. The "locked" checks skip themselves when
 * the env gate is on (next dev, or NEXT_PUBLIC_ENABLE_MOCK_APPLICATIONS=1).
 * Never submits: the Submit test dismisses the sample confirm dialog.
 */
const KEY = "rapid2027";
const SHOTS = process.env.MOCK_SHOTS_DIR ?? join(process.cwd(), "qa/apply-flow-shots/mocks");
const STEPS = ["Scholarship", "Personal", "Family", "Academics", "Support", "Essays", "Documents", "Review"];
const MOCKS = [
  { id: "john-ivy", name: "Akram Naseem", label: "John-Ivy Azariah", slots: ["photo", "cnic", "guardian_cnic", "admission_proof", "result", "fee_voucher", "pastor_letter"] },
  { id: "ivy", name: "Ayesha Khan", label: "Ivy Azariah", slots: ["photo", "cnic", "guardian_cnic", "admission_proof", "result", "fee_voucher", "pastor_letter"] },
  { id: "robert", name: "Bilal Masih", label: "Robert Mathias", slots: ["guardian_cnic", "admission_proof", "result", "fee_voucher", "pastor_letter", "other_award"] },
];
const VIEWPORTS = [
  { name: "iphone16", width: 393, height: 852, mobile: true },
  { name: "pixel7", width: 412, height: 915, mobile: true },
  { name: "tablet768", width: 768, height: 1024, mobile: false },
  { name: "desktop1440", width: 1440, height: 900, mobile: false },
];

test.describe.configure({ timeout: 300_000 });

async function envGateOn(page: Page): Promise<boolean> {
  const response = await page.request.get("/api/dev/mock-applications");
  return response.status() === 200;
}

async function noOverflow(page: Page) {
  const report = await page.evaluate(() => {
    const box = document.querySelector<HTMLElement>("[data-testid='mock-tools']");
    const clipped = box
      ? [...box.querySelectorAll<HTMLElement>("p, button, span")]
          .filter((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== "visible")
          .map((el) => el.textContent ?? "")
      : ["no chip box"];
    const outside = box
      ? [...box.querySelectorAll<HTMLElement>("button, p")]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            const b = box.getBoundingClientRect();
            return r.left < b.left - 1 || r.right > b.right + 1;
          })
          .map((el) => el.textContent ?? "")
      : [];
    const small = box
      ? [...box.querySelectorAll<HTMLElement>("button")].filter((el) => el.getBoundingClientRect().height < 44).map((el) => el.textContent ?? "")
      : [];
    return {
      pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
      clipped,
      outside,
      small,
    };
  });
  expect(report.pageOverflow).toBeLessThanOrEqual(0);
  expect(report.clipped).toEqual([]);
  expect(report.outside).toEqual([]);
  expect(report.small).toEqual([]);
}

test.describe("sample mode locked", () => {
  test("no chips and 404 sample routes without the key", async ({ page }) => {
    if (await envGateOn(page)) test.skip(true, "env gate is on for this server (dev or flag)");
    await page.goto("/apply/form", { waitUntil: "domcontentloaded" });
    await expect(page.locator("form[data-hydrated='true']")).toBeVisible();
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("mock-tools")).toHaveCount(0);
    await expect(page.getByText("Test with a sample applicant")).toHaveCount(0);
    await page.goto("/apply?mock=ivy", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/apply(\?|$)/);
    expect((await page.request.get("/api/dev/sample-documents?file=photo-sample.jpg")).status()).toBe(404);
    expect((await page.request.get("/api/dev/sample-documents?file=photo-sample.jpg", { headers: { "x-rapid-demo": "wrong" } })).status()).toBe(404);
    expect((await page.request.get("/api/dev/mock-applications")).status()).toBe(404);
    expect((await page.request.get("/api/dev/mock-applications", { headers: { "x-rapid-demo": "rapid2026" } })).status()).toBe(404);
    const html = await (await page.request.get("/apply/form")).text();
    expect(html).not.toContain("Akram Naseem");
    expect(html).not.toContain(KEY);
  });

  test("the key unlocks the routes", async ({ page }) => {
    expect((await page.request.get("/api/dev/sample-documents?file=photo-sample.jpg", { headers: { "x-rapid-demo": KEY } })).status()).toBe(200);
    expect((await page.request.get(`/api/dev/sample-documents?file=photo-sample.jpg&demo=${KEY}`)).status()).toBe(200);
    const body = await (await page.request.get("/api/dev/mock-applications", { headers: { "x-rapid-demo": KEY } })).json();
    expect(body.mocks.map((item: { name: string }) => item.name)).toEqual(["Akram Naseem", "Ayesha Khan", "Bilal Masih"]);
  });
});

test("?demo=rapid2027 is remembered in this browser and ?demo=off forgets it", async ({ page }) => {
  const gate = await envGateOn(page);
  await page.goto(`/apply?demo=${KEY}`, { waitUntil: "domcontentloaded" });
  await expect.poll(() => page.evaluate(() => localStorage.getItem("rapid-charity-demo"))).toBe(KEY);
  await expect(page).not.toHaveURL(/demo=/);
  await page.goto("/apply/form", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("mock-tools")).toBeVisible();
  await expect(page.getByRole("button", { name: /Akram Naseem/ })).toBeVisible();
  await page.goto("/apply/form?demo=off", { waitUntil: "domcontentloaded" });
  await expect.poll(() => page.evaluate(() => localStorage.getItem("rapid-charity-demo"))).toBeNull();
  if (!gate) {
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("mock-tools")).toHaveCount(0);
  }
});

test("?mock=ivy still prefills when unlocked", async ({ page }) => {
  await page.goto(`/apply?mock=ivy&demo=${KEY}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("form[data-hydrated='true']")).toBeVisible();
  await expect(page.getByText("Applying for: Ivy Azariah")).toBeVisible();
  await expect(page.getByTestId("sample-filled")).toContainText("Ayesha Khan");
  await expect(page).not.toHaveURL(/mock=|demo=/);
});

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name} ${viewport.width}px`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.mobile,
      hasTouch: viewport.mobile,
    });

    for (const mock of MOCKS) {
      test(`${mock.name} chip fills every step and reaches Review`, async ({ page }) => {
        const problems: string[] = [];
        page.on("pageerror", (error) => problems.push(error.message));
        mkdirSync(SHOTS, { recursive: true });
        await page.goto(`/apply/form?demo=${KEY}`, { waitUntil: "domcontentloaded" });
        await expect(page.locator("form[data-hydrated='true']")).toBeVisible();
        const box = page.getByTestId("mock-tools");
        await expect(box).toBeVisible();
        await expect(box.getByText("Test with a sample applicant")).toBeVisible();
        await expect(box.getByText("Samples are for testing. Submitting one creates a real test application.")).toBeVisible();
        // The chip row is the first thing inside the form card, above the step progress.
        expect(await box.evaluate((el) => el.parentElement?.firstElementChild === el)).toBe(true);
        if (viewport.mobile || viewport.width <= 900) {
          const chipBox = await box.boundingBox();
          const progress = await page.getByRole("progressbar", { name: "Application progress" }).boundingBox();
          expect(chipBox && progress).toBeTruthy();
          expect((chipBox?.y ?? 0) + (chipBox?.height ?? 0)).toBeLessThan(progress?.y ?? 0);
        }
        await noOverflow(page);
        if (mock.id === "john-ivy") await page.screenshot({ path: join(SHOTS, `chips-${viewport.name}.png`), animations: "disabled" });

        const chip = box.getByRole("button", { name: new RegExp(mock.name) });
        await expect(chip).toContainText(mock.label);
        await chip.click();
        await expect(chip).toHaveAttribute("aria-pressed", "true");
        await expect(page.getByTestId("sample-filled")).toHaveText(
          new RegExp(`Filled with ${mock.name}'s sample\\. Tap Continue to move through the steps\\.`),
        );
        await expect(box.getByRole("button", { name: "Clear sample" })).toBeVisible();
        await expect(page.getByText(`Applying for: ${mock.label}`)).toBeVisible();
        await noOverflow(page);
        if (mock.id === "john-ivy") await page.screenshot({ path: join(SHOTS, `chips-filled-${viewport.name}.png`), animations: "disabled" });

        for (let index = 0; index < STEPS.length - 1; index += 1) {
          await expect(page.getByRole("heading", { name: STEPS[index], level: 2 })).toBeVisible();
          if (STEPS[index] === "Personal" && mock.id === "john-ivy") {
            await expect(page.getByLabel("First name")).toHaveValue("Akram");
            await page.screenshot({ path: join(SHOTS, `filled-personal-${viewport.name}.png`), animations: "disabled" });
            if (viewport.mobile) await page.screenshot({ path: join(SHOTS, `filled-personal-${viewport.name}-full.png`), fullPage: true, animations: "disabled" });
          }
          if (STEPS[index] === "Documents") {
            for (const slot of mock.slots) {
              await expect(page.locator(`[data-field="documents.${slot}"]`).getByText(/Uploaded|Result \d/).first()).toBeVisible({ timeout: 180_000 });
            }
            await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled({ timeout: 60_000 });
            if (viewport.name === "iphone16") await page.screenshot({ path: join(SHOTS, `${mock.id}-documents-${viewport.name}.png`), fullPage: true, animations: "disabled" });
          }
          await page.getByRole("button", { name: "Continue" }).click();
          await expect(page.locator("[data-form-issues]")).toHaveCount(0);
        }
        await expect(page.getByRole("heading", { name: "Review", level: 2 })).toBeVisible();
        await expect(page.getByRole("checkbox", { name: "I agree" })).toBeChecked();
        await expect(page.getByLabel("Type your full name")).toHaveValue(mock.name);
        await expect(page.locator("[data-form-issues]")).toHaveCount(0);
        await expect(page.getByRole("button", { name: "Submit application" })).toBeEnabled();
        if (viewport.name === "iphone16" || mock.id === "john-ivy") {
          await page.screenshot({ path: join(SHOTS, `${mock.id}-review-${viewport.name}.png`), fullPage: true, animations: "disabled" });
        }

        if (viewport.name === "iphone16" && mock.id === "john-ivy") {
          // Submit with a sample loaded asks first; dismissing sends nothing.
          let posted = false;
          page.on("request", (request) => {
            if (request.method() === "POST" && request.url().endsWith("/api/applications")) posted = true;
          });
          const seen: { type: string; message: string }[] = [];
          page.once("dialog", async (dialog) => {
            seen.push({ type: dialog.type(), message: dialog.message() });
            await dialog.dismiss();
          });
          await page.getByRole("button", { name: "Submit application" }).click();
          await expect.poll(() => seen.length).toBe(1);
          expect(seen[0]?.type).toBe("confirm");
          expect(seen[0]?.message).toContain("Akram Naseem");
          expect(seen[0]?.message).toContain("creates a real test application");
          await page.waitForTimeout(500);
          expect(posted).toBe(false);
          await expect(page.getByRole("heading", { name: "Review", level: 2 })).toBeVisible();
        }
        expect(problems).toEqual([]);
      });
    }
  });
}

test.describe("chip box wraps at 360px", () => {
  test.use({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true });
  test("no overflow, filled and clear", async ({ page }) => {
    await page.goto(`/apply/form?demo=${KEY}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("form[data-hydrated='true']")).toBeVisible();
    await noOverflow(page);
    mkdirSync(SHOTS, { recursive: true });
    await page.screenshot({ path: join(SHOTS, "chips-360.png"), animations: "disabled" });
    await page.getByRole("button", { name: /Bilal Masih/ }).click();
    await expect(page.getByTestId("sample-filled")).toBeVisible();
    await noOverflow(page);
    await page.screenshot({ path: join(SHOTS, "chips-filled-360.png"), animations: "disabled" });
    await page.getByRole("button", { name: "Clear sample" }).click();
    await expect(page.getByTestId("sample-filled")).toHaveCount(0);
    await expect(page.getByRole("radio", { name: /Robert Mathias/ })).not.toBeChecked();
    await expect(page.getByTestId("mock-tools")).toBeVisible();
  });
});
