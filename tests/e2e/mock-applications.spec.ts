import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Sample applications walk through all 8 steps to Review without validation
 * errors. Needs mocks enabled (next dev, or NEXT_PUBLIC_ENABLE_MOCK_APPLICATIONS=1
 * for next start); skips itself otherwise. Never submits.
 */
const SHOTS = process.env.MOCK_SHOTS_DIR ?? join(process.cwd(), "qa/apply-flow-shots/mocks");
const STEPS = ["Scholarship", "Personal", "Family", "Academics", "Support", "Essays", "Documents", "Review"];
const MOCKS = [
  { id: "ivy", label: "Ivy Azariah", slots: ["photo", "cnic", "guardian_cnic", "admission_proof", "result", "fee_voucher", "pastor_letter"] },
  { id: "john-ivy", label: "John-Ivy Azariah", slots: ["photo", "cnic", "guardian_cnic", "admission_proof", "result", "fee_voucher", "pastor_letter"] },
  { id: "robert", label: "Robert Mathias", slots: ["guardian_cnic", "admission_proof", "result", "fee_voucher", "pastor_letter", "other_award"] },
];

test.describe.configure({ timeout: 300_000 });

for (const mock of MOCKS) {
  test(`${mock.id} sample application reaches Review with no errors`, async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await page.addInitScript(() => {
      if (sessionStorage.getItem("mock-ready")) return;
      localStorage.clear();
      sessionStorage.setItem("mock-ready", "1");
    });
    const problems: string[] = [];
    page.on("pageerror", (error) => problems.push(error.message));
    await page.goto(`/apply?mock=${mock.id}`, { waitUntil: "domcontentloaded" });
    if ((await page.getByTestId("mock-tools").count()) === 0) test.skip(true, "mock applications are not enabled on this server");
    await expect(page.locator("form[data-hydrated='true']")).toBeVisible();
    await expect(page.getByText(`Applying for: ${mock.label}`)).toBeVisible();
    mkdirSync(SHOTS, { recursive: true });
    for (let index = 0; index < STEPS.length - 1; index += 1) {
      await expect(page.getByRole("heading", { name: STEPS[index], level: 2 })).toBeVisible();
      if (STEPS[index] === "Documents") {
        await page.getByRole("button", { name: "Upload sample documents" }).click();
        for (const slot of mock.slots) {
          await expect(page.locator(`[data-field="documents.${slot}"]`).getByText(/Uploaded|Result \d/).first()).toBeVisible({ timeout: 180_000 });
        }
        await page.screenshot({ path: join(SHOTS, `${mock.id}-07-documents.png`), fullPage: true });
      }
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(page.locator("[data-form-issues]")).toHaveCount(0);
    }
    await expect(page.getByRole("heading", { name: "Review", level: 2 })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: "I agree" })).toBeChecked();
    await expect(page.getByLabel("Type your full name")).not.toHaveValue("");
    await expect(page.locator("[data-form-issues]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Submit application" })).toBeEnabled();
    await page.screenshot({ path: join(SHOTS, `${mock.id}-08-review.png`), fullPage: true });
    expect(problems).toEqual([]);
  });
}
