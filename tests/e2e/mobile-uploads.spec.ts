import { devices, expect, test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Phone gallery uploads on the Documents step, with iPhone and Pixel emulation
 * (Chromium engine). Picks JPEG, PNG, a real HEIC, a JPEG named .heic, a PDF,
 * two CNIC photos at once, and a large (over 5 MB) phone-size JPEG.
 */
const DOCS = join(process.cwd(), "tests/fixtures/sample-documents");
const SHOTS = process.env.UPLOAD_SHOTS_DIR ?? join(process.cwd(), "qa/apply-flow-shots/uploads");
const ivy = JSON.parse(readFileSync(join(process.cwd(), "content/mock-applications/ivy-azariah.json"), "utf8"));

function phone(name: "iPhone 15" | "Pixel 7") {
  const { defaultBrowserType: _ignored, ...rest } = devices[name];
  void _ignored;
  return rest;
}

async function openDocuments(page: Page) {
  await page.addInitScript((data) => {
    if (sessionStorage.getItem("upload-ready")) return;
    sessionStorage.setItem("upload-ready", "1");
    localStorage.setItem(
      "rapid-application-draft-v1",
      JSON.stringify({ data: { ...data, client_id: crypto.randomUUID(), documents: [] }, step: 6, savedAt: new Date().toISOString() }),
    );
  }, ivy);
  await page.goto("/apply/form?scholarship=ivy-azariah", { waitUntil: "domcontentloaded" });
  await expect(page.locator("form[data-hydrated='true']")).toBeVisible();
  await page.getByRole("button", { name: "Resume" }).click();
  await expect(page.getByRole("heading", { name: "Documents", level: 2 })).toBeVisible();
}

async function bigPhoto(page: Page) {
  const base64 = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 4032;
    canvas.height = 3024;
    const context = canvas.getContext("2d")!;
    const image = context.createImageData(4032, 3024);
    for (let i = 0; i < image.data.length; i += 4) {
      const v = (i * 2654435761) >>> 24;
      image.data[i] = v;
      image.data[i + 1] = (v * 7) & 255;
      image.data[i + 2] = (v * 13) & 255;
      image.data[i + 3] = 255;
    }
    context.putImageData(image, 0, 0);
    context.fillStyle = "#B20F3A";
    context.font = "bold 300px sans-serif";
    context.fillText("SAMPLE", 200, 600);
    const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.97));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(binary);
  });
  return { name: "IMG_4032.jpg", mimeType: "image/jpeg", buffer: Buffer.from(base64, "base64") };
}

for (const device of ["iPhone 15", "Pixel 7"] as const) {
  test.describe(device, () => {
    test.use(phone(device));
    test.describe.configure({ timeout: 240_000 });

    test(`gallery uploads work on ${device}`, async ({ page }) => {
      const tag = device === "iPhone 15" ? "iphone" : "pixel";
      mkdirSync(SHOTS, { recursive: true });
      await openDocuments(page);
      const photoInput = page.locator("#doc-photo");
      // Picker hints: image types + PDF, no camera capture.
      await expect(photoInput).toHaveAttribute("accept", /image\/heic/);
      await expect(photoInput).toHaveAttribute("accept", /image\/heif/);
      await expect(photoInput).toHaveAttribute("accept", /\.heif/);
      await expect(photoInput).toHaveAttribute("accept", /image\/webp/);
      await expect(photoInput).not.toHaveAttribute("capture", /.*/);
      expect(await page.locator("input[type=file][capture]").count()).toBe(0);
      // The input is visually hidden, not display:none, and its label is the tap target.
      expect(await photoInput.evaluate((el) => getComputedStyle(el).display)).not.toBe("none");
      const drop = page.locator("[data-field='documents.photo'] label[for='doc-photo'][data-focus]");
      await expect(drop).toContainText("Choose from your photo gallery or files");
      await expect(page.getByText("Take a photo first, save it to your gallery, then upload it here.")).toBeVisible();
      await page.screenshot({ path: join(SHOTS, `${tag}-01-empty.png`) });

      const cases: { slot: string; files: string[] | "big"; name: RegExp }[] = [
        { slot: "photo", files: ["photo-sample.jpg"], name: /photo-sample\.jpg/ },
        { slot: "guardian_cnic", files: ["guardian-cnic-sample.png"], name: /guardian-cnic-sample\.png/ },
        { slot: "admission_proof", files: ["admission-letter-sample.pdf"], name: /admission-letter-sample\.pdf/ },
        { slot: "result", files: ["phone-photo-sample.heic"], name: /phone-photo-sample\.heic/ },
        { slot: "cnic", files: ["cnic-front-sample.jpg", "cnic-back-sample.jpg"], name: /cnic-front-sample\.jpg \+ cnic-back-sample\.jpg/ },
        { slot: "fee_voucher", files: "big", name: /IMG_4032\.jpg/ },
      ];
      for (const item of cases) {
        const input = page.locator(`#doc-${item.slot}`);
        if (item.files === "big") {
          const big = await bigPhoto(page);
          expect(big.buffer.length).toBeGreaterThan(5 * 1024 * 1024);
          await input.setInputFiles(big);
        } else {
          await input.setInputFiles(item.files.map((file) => join(DOCS, file)));
        }
        const field = page.locator(`[data-field="documents.${item.slot}"]`);
        await expect(field.getByText(/Uploaded|Result \d/).first()).toBeVisible({ timeout: 120_000 });
        await expect(field.getByText(item.name)).toBeVisible();
        if (item.slot === "admission_proof" || item.slot === "cnic") {
          await expect(field.getByText("PDF", { exact: true })).toBeVisible();
        } else {
          await expect(field.locator("img")).toHaveCount(1);
          expect(await field.locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
        }
        if (item.slot === "photo") {
          await field.scrollIntoViewIfNeeded();
          await page.screenshot({ path: join(SHOTS, `${tag}-02-photo-picked.png`) });
        }
      }
      // A JPEG with a .heic name (iOS often converts on pick) is accepted as a JPEG.
      const renamed = readFileSync(join(DOCS, "phone-photo-sample.jpg"));
      await page.locator("#doc-pastor_letter").setInputFiles({ name: "IMG_0001.HEIC", mimeType: "image/heic", buffer: renamed });
      await expect(page.locator("[data-field='documents.pastor_letter']").getByText(/Uploaded/)).toBeVisible({ timeout: 120_000 });
      await page.locator("[data-field='documents.result']").scrollIntoViewIfNeeded();
      await page.screenshot({ path: join(SHOTS, `${tag}-03-heic-and-cnic.png`) });
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(page.getByRole("heading", { name: "Review", level: 2 })).toBeVisible();
    });
  });
}
