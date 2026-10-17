import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

/**
 * Portal-style admin view, end to end on the local file store: submit Akram's
 * sample (local data/ only), check the circular photo in the list and detail,
 * the decision form, the status history, and the portal CSV header line.
 * Deletes the submission, its CNIC key, its number marker and its uploads afterwards.
 * Opt-in (it writes to data/): set ADMIN_PORTAL_E2E=1.
 */
const ENABLED = process.env.ADMIN_PORTAL_E2E === "1";
const AUDIT = process.env.AUDIT_SHOTS_DIR ?? join(process.cwd(), "qa/apply-flow-shots/admin");
const HEADER =
  '"Application Number","Applicant Name","Father / Guardian",CNIC,Gender,Community,"Mobile Number","Family Monthly Income",Scholarship,"Academic Session","Current Institution","Degree Program","Current Semester","Current GPA","GPA Scale","Amount Requested","Religious Leader","Religious Leader Contact",Status,"Submitted On","Reviewed On","Reviewed By",Remarks,"Rejection Reason"';
const STEPS = ["Scholarship", "Personal", "Family", "Academics", "Support", "Essays", "Documents", "Review"];

let submittedId = "";

function cleanup(id: string) {
  if (!id) return;
  const file = join(process.cwd(), "data/submissions", `${id}.json`);
  try {
    const stored = JSON.parse(readFileSync(file, "utf8")) as { cycle: string; cycle_cnic: string; client_id?: string; application_number?: string; documents: { path: string }[] };
    rmSync(join(process.cwd(), "data/submissions/keys", stored.cycle_cnic), { force: true });
    const seq = /-(\d{6})$/.exec(stored.application_number ?? "")?.[1];
    if (seq) rmSync(join(process.cwd(), "data/submissions/numbers", String(Number(seq))), { force: true });
    rmSync(join(process.cwd(), "data/uploads", stored.cycle, id), { recursive: true, force: true });
  } catch {
    // Already gone.
  }
  rmSync(file, { force: true });
}

async function signIn(page: Page) {
  await page.goto("/admin", { waitUntil: "domcontentloaded" });
  const password = process.env.ADMIN_LOCAL_PASSWORD ?? "playwright-local";
  await expect(async () => {
    if ((await page.getByRole("button", { name: "Home", exact: true }).count()) > 0) return;
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("button", { name: "Home", exact: true })).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 20_000 });
}

test.describe("admin portal view", () => {
  test.skip(!ENABLED, "set ADMIN_PORTAL_E2E=1 (writes one local submission into data/ and deletes it)");
  test.describe.configure({ mode: "serial", timeout: 240_000 });
  test.afterAll(() => cleanup(submittedId));

  test("submit a sample locally, then review it with the circular photo and portal CSV", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto("/apply/form?demo=rapid2027", { waitUntil: "domcontentloaded" });
    await expect(page.locator("form[data-hydrated='true']")).toBeVisible();
    await page.getByRole("button", { name: /Akram Naseem/ }).click();
    for (let index = 0; index < STEPS.length - 1; index += 1) {
      await expect(page.getByRole("heading", { name: STEPS[index], level: 2 })).toBeVisible();
      if (STEPS[index] === "Personal") await expect(page.locator("[data-field='documents.photo']").getByText(/^Uploaded, \d+ KB$/)).toBeVisible({ timeout: 60_000 });
      if (STEPS[index] === "Documents") {
        for (const slot of ["cnic", "guardian_cnic", "admission_proof", "result", "fee_voucher", "pastor_letter"]) {
          await expect(page.locator(`[data-field="documents.${slot}"]`).getByText(/Uploaded|Result \d/).first()).toBeVisible({ timeout: 180_000 });
        }
      }
      await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled({ timeout: 60_000 });
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(page.locator("[data-form-issues]")).toHaveCount(0);
    }
    page.once("dialog", (dialog) => void dialog.accept());
    const responsePromise = page.waitForResponse((response) => response.url().endsWith("/api/applications") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Submit application" }).click();
    const response = await responsePromise;
    const body = (await response.json()) as { id?: string; application_number?: string; fieldErrors?: unknown; formError?: string };
    expect(response.status(), JSON.stringify(body)).toBe(201);
    submittedId = body.id ?? "";
    expect(body.application_number).toMatch(/^RAPID-(SP|FA)\d{4}-\d{6}$/);
    await expect(page.getByRole("heading", { name: "Application received" })).toBeVisible();
    await expect(page.getByText(body.application_number ?? "")).toBeVisible();

    await signIn(page);
    await page.getByRole("button", { name: "Applications", exact: true }).click();
    const card = page.locator("li", { hasText: body.application_number ?? "" }).first();
    await expect(card).toBeVisible();
    const listPhoto = card.getByTestId("admin-photo-list");
    await expect(listPhoto).toBeVisible();
    await card.getByRole("button", { name: "View" }).click();
    const photo = card.getByTestId("admin-photo-detail");
    await expect(photo).toBeVisible();
    await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    const box = await photo.evaluate((img: HTMLImageElement) => ({
      w: Math.round(img.getBoundingClientRect().width),
      radius: getComputedStyle(img.parentElement as HTMLElement).borderRadius,
      fit: getComputedStyle(img).objectFit,
    }));
    expect(box.w).toBeGreaterThanOrEqual(88);
    expect(box.w).toBeLessThanOrEqual(96);
    expect(box.radius).toBe("50%");
    expect(box.fit).toBe("cover");

    // Approving needs an amount; saving Under Review adds to the status history.
    const decision = card.locator("form", { hasText: "Decision" });
    await decision.getByLabel("Status").selectOption("approved");
    await decision.getByLabel(/Approved amount/).fill("");
    await decision.getByRole("button", { name: "Save decision" }).click();
    await expect(decision.getByRole("alert")).toHaveText("Enter the approved amount in PKR to approve.");
    await decision.getByLabel("Status").selectOption("under_review");
    await decision.getByLabel(/Internal remarks/).fill("Checked the fee voucher.");
    await decision.getByRole("button", { name: "Save decision" }).click();
    await expect(card.getByTestId("status-history")).toContainText("Submitted to Under Review by local-admin", { timeout: 15_000 });
    await expect(card.getByText("Checked the fee voucher.")).toBeVisible();

    mkdirSync(AUDIT, { recursive: true });
    await card.getByTestId("admin-photo-detail").evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 120));
    await page.screenshot({ path: join(AUDIT, "admin-detail-photo.png"), animations: "disabled" });
    await card.locator("header").first().screenshot({ path: join(AUDIT, "admin-detail-photo-header.png"), animations: "disabled" });

    const csv = await (await page.request.get("/api/admin/applications/export")).text();
    const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/);
    expect(lines[0]).toBe(HEADER);
    const row = lines.find((line) => line.startsWith(`${body.application_number},`)) ?? "";
    expect(row).toContain("Akram Naseem");
    expect(row).toContain("Under Review");
    expect(row).toContain("local-admin");
  });
});
