import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * The ?demo=rapid2027 sample flow on a production server with no storage
 * configured (Vercel without Firebase, Drive or Cloudinary env vars).
 * Opt-in: start `VERCEL=1 VERCEL_ENV=production next start -p 4731` and set
 * NO_STORAGE_BASE_URL=http://127.0.0.1:4731. Nothing is stored by this test.
 */
const BASE = process.env.NO_STORAGE_BASE_URL ?? "";
const SHOTS = process.env.AUDIT_SHOTS_DIR ?? join(process.cwd(), "qa/apply-flow-shots/no-storage");
const STEPS = ["Scholarship", "Personal", "Family", "Academics", "Support", "Essays", "Documents", "Review"];
const UNAVAILABLE = "Uploads are temporarily unavailable. Please try again later or contact us.";

test.describe("no storage backend", () => {
  test.skip(!BASE, "set NO_STORAGE_BASE_URL to a server started with VERCEL=1 and no storage env vars");
  test.use({ baseURL: BASE, viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
  test.describe.configure({ timeout: 240_000 });

  test("a real upload gets a clear unavailable message", async ({ request }) => {
    const response = await request.post("/api/applications/upload", {
      multipart: {
        applicationId: "3f0c9a52-1d1e-4c55-9a52-7d6c1b2a0001",
        slot: "cnic",
        index: "1",
        file: { name: "cnic.jpg", mimeType: "image/jpeg", buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) },
      },
    });
    expect(response.status()).toBe(503);
    const body = await response.json();
    expect(body).toEqual({ error: UNAVAILABLE, code: "uploads_unavailable" });
  });

  test("Akram's sample reaches Review with sample files that are not uploaded, and Submit fails gracefully", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/apply/form?demo=rapid2027", { waitUntil: "domcontentloaded" });
    await expect(page.locator("form[data-hydrated='true']")).toBeVisible();
    await page.getByRole("button", { name: /Akram Naseem/ }).click();
    await expect(page.getByTestId("sample-filled")).toBeVisible();
    for (let index = 0; index < STEPS.length - 1; index += 1) {
      await expect(page.getByRole("heading", { name: STEPS[index], level: 2 })).toBeVisible();
      if (STEPS[index] === "Personal") {
        const photo = page.locator("[data-field='documents.photo']");
        await expect(photo.getByText("Sample file (not uploaded)", { exact: true })).toBeVisible({ timeout: 60_000 });
        await expect(photo.getByTestId("photo-preview")).toBeVisible();
        await expect(page.getByText(UNAVAILABLE)).toHaveCount(0);
        mkdirSync(SHOTS, { recursive: true });
        await photo.scrollIntoViewIfNeeded();
        await page.screenshot({ path: join(SHOTS, "no-storage-personal-393.png"), animations: "disabled" });
      }
      if (STEPS[index] === "Documents") {
        for (const slot of ["cnic", "guardian_cnic", "admission_proof", "result", "fee_voucher", "pastor_letter"]) {
          await expect(page.locator(`[data-field="documents.${slot}"]`).getByText("Sample file (not uploaded)").first()).toBeVisible({ timeout: 180_000 });
        }
        await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled({ timeout: 60_000 });
        await page.screenshot({ path: join(SHOTS, "no-storage-documents-393.png"), fullPage: true, animations: "disabled" });
      }
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(page.locator("[data-form-issues]")).toHaveCount(0);
    }
    await expect(page.getByRole("heading", { name: "Review", level: 2 })).toBeVisible();
    await expect(page.getByTestId("review-photo")).toBeVisible();
    await expect(page.getByText(/sample files? not uploaded/)).toBeVisible();
    await page.getByRole("heading", { name: "Review", level: 2 }).evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 90));
    await page.screenshot({ path: join(SHOTS, "no-storage-review-393.png"), animations: "disabled" });

    // Submit stays behind the sample confirm; accepting it fails with a clear message and nothing is saved.
    page.once("dialog", (dialog) => void dialog.accept());
    const responsePromise = page.waitForResponse((response) => response.url().endsWith("/api/applications") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Submit application" }).click();
    const response = await responsePromise;
    expect([409, 503]).toContain(response.status());
    const alert = page.locator("[data-form-issues]");
    await expect(alert).toContainText("Nothing was submitted");
    await expect(page.getByRole("heading", { name: "Application received" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Submit application" })).toBeEnabled();
    await page.screenshot({ path: join(SHOTS, "no-storage-submit-393.png"), animations: "disabled" });
    expect(errors).toEqual([]);
  });
});
