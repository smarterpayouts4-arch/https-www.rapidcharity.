import { PDFDocument } from "pdf-lib";
import {
  blurWarning,
  extractCnicDigits,
  extractFeeAmount,
  feeWithinTolerance,
  imageStats,
  keywordWarnings,
  MAX_PDF_PAGES,
  MIN_IMAGE_HEIGHT,
  MIN_IMAGE_WIDTH,
  readabilityIssue,
  sniffType,
  textContainsName,
} from "./fileRules";
import { normalizeCnic } from "./normalize";
import type { DocumentChecks } from "./types";

export type PreparedFile = { blob: Blob; name: string; checks: DocumentChecks };

function checksFrom(partial: Partial<DocumentChecks>): DocumentChecks {
  return {
    magic_ok: true,
    readable: true,
    blur_score: null,
    brightness: null,
    width: null,
    height: null,
    page_count: null,
    warnings: [],
    name_score: null,
    cnic_match: null,
    fee_extracted: null,
    fee_match: null,
    duplicate_across: false,
    extracted_text: "",
    ...partial,
  };
}

async function blobOf(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("This photo could not be compressed.");
  return blob;
}

async function compressImage(file: Blob): Promise<{ blob: Blob; width: number; height: number; blur: number; brightness: number }> {
  const bitmap = await createImageBitmap(file);
  const width = bitmap.width;
  const height = bitmap.height;
  if (width < MIN_IMAGE_WIDTH || height < MIN_IMAGE_HEIGHT) {
    bitmap.close();
    throw new Error("This photo is smaller than 800×600. Retake it so the text can be read.");
  }
  const scale = Math.min(1, 1600 / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    bitmap.close();
    throw new Error("This browser could not read the photo.");
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const stats = imageStats(context.getImageData(0, 0, canvas.width, canvas.height));
  const blocked = readabilityIssue({ width, height, blur: stats.blur, brightness: stats.brightness });
  if (blocked && (stats.brightness < 18 || stats.blur < 12)) throw new Error(blocked);
  let quality = 0.8;
  let blob = await blobOf(canvas, quality);
  while (blob.size > 5 * 1024 * 1024 && quality > 0.45) {
    quality -= 0.15;
    blob = await blobOf(canvas, quality);
  }
  if (blob.size > 5 * 1024 * 1024) throw new Error("This photo is still over 5 MB after compression.");
  return { blob, width, height, blur: stats.blur, brightness: stats.brightness };
}

async function readText(blob: Blob): Promise<string> {
  try {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");
    const result = await worker.recognize(blob);
    await worker.terminate();
    return result.data.text ?? "";
  } catch {
    return "";
  }
}

async function maybeHeic(file: File): Promise<File> {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (sniffType(bytes) !== "image/heic" && !file.name.toLowerCase().endsWith(".heic")) return file;
  try {
    const heic2any = (await import("heic2any")).default;
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    if (!blob) throw new Error("empty");
    return new File([blob], "photo.jpg", { type: "image/jpeg" });
  } catch {
    throw new Error("Save this HEIC photo as JPG and upload it again.");
  }
}

export async function mergeImagesToPdf(files: File[]): Promise<Blob> {
  const pdf = await PDFDocument.create();
  for (const file of files.slice(0, 2)) {
    const prepared = await compressImage(file);
    const image = await pdf.embedJpg(new Uint8Array(await prepared.blob.arrayBuffer()));
    const page = pdf.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  }
  return new Blob([new Uint8Array(await pdf.save())], { type: "application/pdf" });
}

export async function prepareFile(
  file: File,
  context: { slot: string; name: string; cnic: string; fatherName: string; fee: number | null },
): Promise<PreparedFile> {
  const source = await maybeHeic(file);
  const head = new Uint8Array(await source.slice(0, 32).arrayBuffer());
  const kind = sniffType(head);
  if (kind === "reject" || kind === "image/heic") {
    throw new Error("Use a JPG, PNG, or PDF. Word files, zip files, and chat screenshots are not accepted.");
  }
  if (kind === "application/pdf") {
    const bytes = new Uint8Array(await source.arrayBuffer());
    if (bytes.byteLength > 5 * 1024 * 1024) throw new Error("Each file must be 5 MB or smaller.");
    let pages = 0;
    try {
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: false });
      pages = pdf.getPageCount();
    } catch {
      throw new Error("This PDF is password-protected or damaged.");
    }
    if (pages < 1 || pages > MAX_PDF_PAGES) throw new Error("PDFs can be at most 10 pages.");
    return {
      blob: new Blob([bytes], { type: "application/pdf" }),
      name: `${context.slot}.pdf`,
      checks: checksFrom({
        page_count: pages,
        warnings: ["Text checks run on photos. A reviewer will read this PDF."],
      }),
    };
  }
  const compressed = await compressImage(source);
  const warnings: string[] = [];
  const soft = blurWarning(compressed.blur);
  if (soft) warnings.push(soft);
  let extracted = "";
  if (["cnic", "guardian_cnic", "fee_voucher", "result", "pastor_letter"].includes(context.slot)) {
    extracted = await readText(compressed.blob);
    if (!extracted.trim()) warnings.push("No text could be read automatically. A reviewer will check this file.");
  }
  const keyword = keywordWarnings(context.slot, extracted);
  if (keyword.some((item) => item.includes("chat screenshot"))) throw new Error(keyword[0]);
  warnings.push(...keyword.filter((item) => !item.startsWith("No text")));
  const target = context.slot === "guardian_cnic" ? context.fatherName : context.name;
  const nameScore = extracted.trim() ? textContainsName(extracted, target) : null;
  if (nameScore !== null && nameScore < 0.85) warnings.push("The name on this file does not closely match what you typed.");
  const typedCnic = normalizeCnic(context.cnic);
  const foundCnic = extracted ? extractCnicDigits(extracted) : null;
  let cnicMatch: boolean | null = null;
  if ((context.slot === "cnic" || context.slot === "guardian_cnic") && foundCnic && typedCnic.ok) {
    cnicMatch = foundCnic === typedCnic.digits;
    if (!cnicMatch) warnings.push("The CNIC on this file does not match the number you typed.");
  }
  const feeExtracted = context.slot === "fee_voucher" && extracted ? extractFeeAmount(extracted) : null;
  let feeMatch: boolean | null = null;
  if (feeExtracted !== null && context.fee !== null) {
    feeMatch = feeWithinTolerance(context.fee, feeExtracted);
    if (!feeMatch) warnings.push("The amount on the voucher does not match the fee you entered, within 2%.");
  }
  return {
    blob: compressed.blob,
    name: `${context.slot}.jpg`,
    checks: checksFrom({
      blur_score: compressed.blur,
      brightness: compressed.brightness,
      width: compressed.width,
      height: compressed.height,
      warnings: [...new Set(warnings)].slice(0, 12),
      name_score: nameScore,
      cnic_match: cnicMatch,
      fee_extracted: feeExtracted,
      fee_match: feeMatch,
      extracted_text: extracted.slice(0, 4000),
    }),
  };
}
