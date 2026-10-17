#!/usr/bin/env node
/**
 * Generates the SAMPLE test documents in tests/fixtures/sample-documents/.
 * Every file is drawn with code (canvas or pdf-lib) and is clearly labeled
 * SAMPLE. No photos are used. Run: node scripts/generate-sample-documents.mjs
 *
 * The HEIC file (phone-photo-sample.heic) needs Python with pillow-heif, which
 * is not a project dependency. It is committed, so you only need this if you
 * want to regenerate it: pass --heic and have `python3 -c "import pillow_heif"`
 * working. Pass --only=<file name> to regenerate a single file.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";

const OUT = join(process.cwd(), "tests/fixtures/sample-documents");
mkdirSync(OUT, { recursive: true });

const IMAGES = [
  // Square passport-size photo, as the scholarship portal asks (600 x 600, under 500 KB).
  { file: "passport-photo-sample.jpg", type: "image/jpeg", w: 600, h: 600, title: "SAMPLE", lines: ["Passport-size photo", "Not a real person"], face: true, square: true },
  { file: "photo-sample.jpg", type: "image/jpeg", w: 1200, h: 1500, title: "SAMPLE PASSPORT PHOTO", lines: ["Test applicant photo", "Not a real person"], face: true },
  { file: "cnic-front-sample.jpg", type: "image/jpeg", w: 1280, h: 820, title: "SAMPLE CNIC FRONT", lines: ["Islamic Republic of Pakistan", "National Identity Card (CNIC)", "NADRA test card, not valid", "Name: Sample Applicant", "35202-0000001-2"] },
  { file: "cnic-back-sample.jpg", type: "image/jpeg", w: 1280, h: 820, title: "SAMPLE CNIC BACK", lines: ["Islamic Republic of Pakistan", "CNIC reverse side, NADRA test", "Address: Sample Street, Lahore", "Not a real identity document"] },
  { file: "guardian-cnic-sample.png", type: "image/png", w: 1280, h: 820, title: "SAMPLE GUARDIAN CNIC", lines: ["Islamic Republic of Pakistan", "Identity card of father or guardian", "NADRA test card, not valid", "Name: Sample Father"] },
  { file: "result-card-sample.png", type: "image/png", w: 1240, h: 1600, title: "SAMPLE RESULT CARD", lines: ["Semester result transcript", "Semester 2: CGPA 3.60 / 4.00", "Marks and grade: A-", "Issued for testing only"] },
  { file: "fee-voucher-sample.jpg", type: "image/jpeg", w: 1240, h: 900, title: "SAMPLE FEE VOUCHER", lines: ["Fee voucher / challan", "Amount payable: 85000", "Due date: 15 January 2027", "Test voucher, do not pay"] },
  { file: "phone-photo-sample.jpg", type: "image/jpeg", w: 1600, h: 1200, title: "SAMPLE PHONE PHOTO", lines: ["A JPEG like a phone camera makes", "Use it to test the photo picker"] },
  { file: "phone-photo-sample.png", type: "image/png", w: 1600, h: 1200, title: "SAMPLE SCREENSHOT PNG", lines: ["A PNG image for upload testing", "Not a real document"] },
];

const PDFS = [
  { file: "admission-letter-sample.pdf", title: "SAMPLE ADMISSION LETTER", lines: ["Enrolment letter for Sample Applicant", "Admitted to the Spring 2027 term", "Issued for testing only"] },
  { file: "pastor-letter-sample.pdf", title: "SAMPLE PASTOR LETTER", lines: ["Church recommendation letter", "I recommend Sample Applicant to Rapid Charity.", "Sincerely, Sample Pastor", "Test document, not signed"] },
  { file: "other-award-sample.pdf", title: "SAMPLE AWARD LETTER", lines: ["Other scholarship award letter", "Institution financial aid: 25 percent", "Test document only"] },
  { file: "income-proof-sample.pdf", title: "SAMPLE INCOME PROOF", lines: ["Monthly income statement", "Test document only"] },
  { file: "disability-certificate-sample.pdf", title: "SAMPLE DISABILITY CERTIFICATE", lines: ["Certificate for testing only", "Not a real medical document"] },
];

async function images() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const spec of IMAGES.filter(wanted)) {
    const dataUrl = await page.evaluate((s) => {
      const canvas = document.createElement("canvas");
      canvas.width = s.w;
      canvas.height = s.h;
      const c = canvas.getContext("2d");
      c.fillStyle = "#F7F4EF";
      c.fillRect(0, 0, s.w, s.h);
      c.strokeStyle = "#222222";
      c.lineWidth = 10;
      c.strokeRect(30, 30, s.w - 60, s.h - 60);
      c.fillStyle = "#B20F3A";
      c.font = "bold 64px sans-serif";
      c.fillText(s.title, 70, 140);
      c.fillStyle = "#222222";
      c.font = "40px sans-serif";
      s.lines.forEach((line, i) => c.fillText(line, 70, 230 + i * 62));
      if (s.square) {
        // Simple placeholder: ivory square, crimson head and shoulders, and a SAMPLE band
        // across the middle so the label stays readable inside a circular crop.
        c.fillStyle = "#F7F4EF";
        c.fillRect(0, 0, s.w, s.h);
        c.fillStyle = "#FFE8EE";
        c.fillRect(24, 24, s.w - 48, s.h - 48);
        c.fillStyle = "#8B0A24";
        c.beginPath();
        c.arc(s.w / 2, s.h * 0.33, s.w * 0.13, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.ellipse(s.w / 2, s.h * 0.98, s.w * 0.32, s.h * 0.4, 0, Math.PI, 0);
        c.fill();
        c.fillStyle = "#B20F3A";
        c.fillRect(0, s.h * 0.5, s.w, s.h * 0.16);
        c.fillStyle = "#FFFFFF";
        c.font = "bold 84px sans-serif";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText("SAMPLE", s.w / 2, s.h * 0.58);
        c.fillStyle = "#F7F4EF";
        c.font = "26px sans-serif";
        s.lines.forEach((line, i) => c.fillText(line, s.w / 2, s.h * 0.75 + i * 34));
        return canvas.toDataURL(s.type, 0.88);
      }
      if (s.face) {
        c.fillStyle = "#8B0A24";
        c.beginPath();
        c.arc(s.w / 2, s.h * 0.55, 190, 0, Math.PI * 2);
        c.fill();
        c.fillRect(s.w / 2 - 330, s.h * 0.72, 660, 340);
      }
      // Barcode-like bars give the image real edges, so blur checks pass.
      for (let i = 0; i < 60; i += 1) {
        const x = 70 + ((i * 37) % (s.w - 160));
        c.fillRect(x, s.h - 200 + (i % 5) * 10, 8 + (i % 4) * 4, 90);
      }
      c.save();
      c.translate(s.w / 2, s.h / 2);
      c.rotate(-Math.PI / 7);
      c.globalAlpha = 0.16;
      c.fillStyle = "#B20F3A";
      c.font = `bold ${Math.round(s.w / 4.2)}px sans-serif`;
      c.textAlign = "center";
      c.fillText("SAMPLE", 0, 60);
      c.restore();
      return canvas.toDataURL(s.type, 0.9);
    }, spec);
    writeFileSync(join(OUT, spec.file), Buffer.from(dataUrl.split(",")[1], "base64"));
  }
  await browser.close();
}

function wanted(spec) {
  const only = process.argv.find((arg) => arg.startsWith("--only="));
  return !only || only.slice(7) === spec.file;
}

async function pdfs() {
  for (const spec of PDFS.filter(wanted)) {
    const pdf = await PDFDocument.create();
    pdf.setTitle(spec.title);
    pdf.setProducer("Rapid Charity sample generator");
    const page = pdf.addPage([595, 842]);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    page.drawRectangle({ x: 24, y: 24, width: 547, height: 794, borderColor: rgb(0.13, 0.13, 0.13), borderWidth: 3 });
    page.drawText(spec.title, { x: 50, y: 760, size: 24, font: bold, color: rgb(0.698, 0.059, 0.227) });
    spec.lines.forEach((line, i) => page.drawText(line, { x: 50, y: 700 - i * 30, size: 15, font, color: rgb(0.13, 0.13, 0.13) }));
    page.drawText("SAMPLE", { x: 110, y: 260, size: 120, font: bold, color: rgb(0.698, 0.059, 0.227), opacity: 0.15, rotate: degrees(30) });
    writeFileSync(join(OUT, spec.file), await pdf.save());
  }
}

await images();
await pdfs();
if (process.argv.includes("--heic")) {
  execFileSync("python3", ["-c", [
    "import pillow_heif; from PIL import Image",
    "pillow_heif.register_heif_opener()",
    `im = Image.open(${JSON.stringify(join(OUT, "phone-photo-sample.jpg"))})`,
    `im.save(${JSON.stringify(join(OUT, "phone-photo-sample.heic"))}, format='HEIF', quality=70)`,
  ].join("; ")], { stdio: "inherit" });
}
console.log(`Sample documents written to ${OUT}`);
