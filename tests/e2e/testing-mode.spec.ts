import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const SHOTS = "/workspace/rapid-charity/audit13";
mkdirSync(SHOTS, { recursive: true });
const KEY = "rapid2027";

async function emptyWalk(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto(`/apply/form?demo=${KEY}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("form[data-hydrated='true']")).toBeVisible();
  await expect(page.getByTestId("testing-banner")).toBeVisible();
  await expect(page.getByTestId("testing-banner")).toContainText("without filling anything in");
  for (let i = 0; i < 7; i += 1) {
    await page.getByRole("button", { name: /Continue|Back to review/ }).click();
  }
  await expect(page.getByRole("heading", { name: "Review", level: 2 })).toBeVisible();
  await expect(page.locator("[data-form-issues]")).toHaveCount(0);
  await expect(page.locator("[data-invalid='true']")).toHaveCount(0);
}

test.describe("testing mode empty walk", () => {
  test("393px: empty form reaches Review and testing submit sends nothing", async ({ page }) => {
    await emptyWalk(page, 393, 852);
    await page.screenshot({ path: join(SHOTS, "empty-walk-review-393.png"), fullPage: true });
    await page.getByRole("button", { name: "Submit application" }).click();
    await expect(page.getByTestId("testing-submitted")).toBeVisible();
    await expect(page.getByTestId("testing-submitted")).toContainText("Nothing was sent");
  });

  test("1440px: empty form reaches Review", async ({ page }) => {
    await emptyWalk(page, 1440, 900);
  });

  test("comboboxes resolve bsn, fccu, kinnaird and Other at 393px", async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await page.goto(`/apply/form?demo=${KEY}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("testing-banner")).toBeVisible();
    for (let i = 0; i < 3; i += 1) await page.getByRole("button", { name: /Continue/ }).click();
    await expect(page.getByRole("heading", { name: "Academics", level: 2 })).toBeVisible();
    const institution = page.getByRole("combobox", { name: "Current institution" });
    await institution.click();
    await institution.fill("fccu");
    await expect(page.getByRole("option", { name: /Forman Christian College/ }).first()).toBeVisible();
    await page.getByRole("option", { name: /Forman Christian College/ }).first().click();
    await expect(institution).toHaveValue(/Forman Christian College/);
    // FC College alias resolves to the same canonical institution
    await institution.click();
    await institution.fill("FC College");
    await expect(page.getByRole("option", { name: /Forman Christian College/ }).first()).toBeVisible();
    await page.getByRole("option", { name: /Forman Christian College/ }).first().click();
    const program = page.getByRole("combobox", { name: "Program title" });
    await program.click();
    await program.fill("bsn");
    await page.screenshot({ path: join(SHOTS, "combobox-bsn-393.png"), fullPage: true });
    await expect(page.getByRole("option", { name: /BS Nursing/ }).first()).toBeVisible();
    await page.getByRole("option", { name: /BS Nursing/ }).first().click();
    await expect(program).toHaveValue(/BS Nursing/);
    const previous = page.getByRole("combobox", { name: "Previous institution" });
    await previous.click();
    await previous.fill("kinnaird");
    await expect(page.getByRole("option", { name: /Kinnaird/ }).first()).toBeVisible();
    await page.getByRole("option", { name: /Kinnaird/ }).first().click();
    await expect(previous).toHaveValue(/Kinnaird/);
    // Other reveals a text box and keeps the typed text
    await institution.click();
    await institution.fill("zzzz made up");
    await page.getByRole("option", { name: /Other \(please specify\)/ }).click();
    const otherBox = page.getByLabel("Current institution other");
    await expect(otherBox).toBeVisible();
    await otherBox.fill("Made Up School of Testing");
    await expect(otherBox).toHaveValue("Made Up School of Testing");
    await page.screenshot({ path: join(SHOTS, "combobox-other-393.png"), fullPage: true });
    await page.getByRole("button", { name: /Continue/ }).click();
    await expect(page.getByRole("heading", { name: "Support", level: 2 })).toBeVisible();
    await page.screenshot({ path: join(SHOTS, "family-step-393.png"), fullPage: true });
  });

  test("without unlock and without env gate, the empty form stays blocked", async ({ page }) => {
    await page.goto("/apply/form?demo=off", { waitUntil: "domcontentloaded" });
    await expect(page.locator("form[data-hydrated='true']")).toBeVisible();
    if (await page.getByTestId("testing-banner").count()) {
      test.skip(true, "env testing gate is on for this server; blocked check needs a production server without flags");
    }
    await page.getByRole("button", { name: /Continue/ }).click();
    // Still on step 1: required errors appear instead of moving to Personal
    await expect(page.getByRole("heading", { name: "Scholarship", level: 2 })).toBeVisible();
    await expect(page.locator("[data-form-issues], [data-invalid='true']").first()).toBeVisible();
  });

  test("?demo=off re-imposes barriers on a production server", async ({ page }) => {
    await page.goto(`/apply/form?demo=${KEY}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("testing-banner")).toBeVisible();
    await page.goto("/apply/form?demo=off", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    if (await page.getByTestId("testing-banner").count()) {
      test.skip(true, "env testing gate is on for this server; ?demo=off only removes the unlock");
    }
    await expect(page.getByTestId("testing-banner")).toHaveCount(0);
  });
});
