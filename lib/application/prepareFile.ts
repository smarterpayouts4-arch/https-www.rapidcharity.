import { PDFDocument } from "pdf-lib";
import {
  blurWarning,
  extractCnicDigits,
  extractFeeAmount,
  feeWithinTolerance,
  imageStats,
  keywordWarnings,
  MAX_PDF_PAGES,
  MAX_PHOTO_BYTES,
  MIN_IMAGE_HEIGHT,
  PHOTO_MAX_SIDE,
  PHOTO_MIN_SIDE,
  MIN_IMAGE_WIDTH,
  readabilityIssue,
  sniffType,
  textContainsName,
} from "./fileRules";
import { normalizeCnic } from "./normalize";
import type { DocumentChecks } from "./types";

/** Informational note added to every PDF; not a problem with the file. */
export const PDF_NOTE = "Text checks run on photos. A reviewer will read this PDF.";

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

/**
 * HEIC/HEIF (iPhone default) becomes JPEG in the browser before upload, so the
 * server only ever stores JPG, PNG or PDF. heic2any is libheif compiled to wasm,
 * so this also works in Android Chrome, which cannot decode HEIC natively.
 * Decided by the file's bytes, not its name: a ".heic" name with JPEG bytes
 * (iOS often converts on pick) is used as-is.
 */
async function maybeHeic(file: File): Promise<File> {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (sniffType(bytes) !== "image/heic") return file;
  try {
    const heic2any = (await import("heic2any")).default;
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    if (!blob) throw new Error("empty");
    return new File([blob], "photo.jpg", { type: "image/jpeg" });
  } catch {
    throw new Error("This HEIC photo could not be read. Save it as JPG and upload it again.");
  }
}

function isWebp(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 12 &&
    String.fromCharCode(bytes[0] ?? 0, bytes[1] ?? 0, bytes[2] ?? 0, bytes[3] ?? 0) === "RIFF" &&
    String.fromCharCode(bytes[8] ?? 0, bytes[9] ?? 0, bytes[10] ?? 0, bytes[11] ?? 0) === "WEBP"
  );
}

export async function mergeImagesToPdf(files: File[]): Promise<Blob> {
  const pdf = await PDFDocument.create();
  for (const file of files.slice(0, 2)) {
    const prepared = await compressImage(await maybeHeic(file));
    const image = await pdf.embedJpg(new Uint8Array(await prepared.blob.arrayBuffer()));
    const page = pdf.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  }
  return new Blob([new Uint8Array(await pdf.save())], { type: "application/pdf" });
}

/**
 * Passport-size photo: any phone photo (JPG, PNG, HEIC, WebP) is resized to fit
 * inside 600 x 600 and saved as a JPEG of at most 500 KB, the portal's limit.
 * Big photos are compressed, never rejected for size. Nothing is cropped; the
 * circular previews use object-fit: cover.
 */
export async function preparePhoto(file: File): Promise<PreparedFile> {
  const source = await maybeHeic(file);
  const head = new Uint8Array(await source.slice(0, 32).arrayBuffer());
  const kind = isWebp(head) ? "image/webp" : sniffType(head);
  if (kind === "application/pdf") throw new Error("Choose a photo of your face (JPG, PNG or HEIC), not a PDF.");
  if (kind === "reject" || kind === "image/heic") throw new Error("Choose a photo (JPG, PNG, HEIC or WebP).");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(source);
  } catch {
    throw new Error("This photo could not be read. Choose another photo.");
  }
  const width = bitmap.width;
  const height = bitmap.height;
  if (width < PHOTO_MIN_SIDE || height < PHOTO_MIN_SIDE) {
    bitmap.close();
    throw new Error("This photo is too small. Use a clear photo of at least 200 x 200 pixels.");
  }
  let side = PHOTO_MAX_SIDE;
  let blob: Blob | null = null;
  let outWidth = 0;
  let outHeight = 0;
  let stats = { blur: 0, brightness: 0 };
  try {
    for (let round = 0; round < 6 && !blob; round += 1) {
      const scale = Math.min(1, side / Math.max(width, height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("This browser could not read the photo.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      if (round === 0) stats = imageStats(context.getImageData(0, 0, canvas.width, canvas.height));
      for (const quality of [0.9, 0.82, 0.74, 0.66, 0.58, 0.5]) {
        const candidate = await blobOf(canvas, quality);
        if (candidate.size <= MAX_PHOTO_BYTES) {
          blob = candidate;
          outWidth = canvas.width;
          outHeight = canvas.height;
          break;
        }
      }
      side = Math.round(side * 0.8);
    }
  } finally {
    bitmap.close();
  }
  if (!blob) throw new Error("This photo could not be made smaller than 500 KB. Choose another photo.");
  const warnings: string[] = [];
  const soft = blurWarning(stats.blur);
  if (soft) warnings.push(soft);
  return {
    blob,
    name: "photo.jpg",
    checks: checksFrom({
      blur_score: stats.blur,
      brightness: stats.brightness,
      width: outWidth,
      height: outHeight,
      warnings,
    }),
  };
}

export async function prepareFile(
  file: File,
  context: { slot: string; name: string; cnic: string; fatherName: string; fee: number | null },
): Promise<PreparedFile> {
  if (context.slot === "photo") return preparePhoto(file);
  const source = await maybeHeic(file);
  const head = new Uint8Array(await source.slice(0, 32).arrayBuffer());
  // WebP (some Android galleries) is decoded by the browser and re-encoded as JPEG below.
  const kind = isWebp(head) ? "image/webp" : sniffType(head);
  if (kind === "reject" || kind === "image/heic") {
    throw new Error("Use a photo (JPG, PNG, HEIC) or a PDF. Word files, zip files, and chat screenshots are not accepted.");
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
        warnings: [PDF_NOTE],
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
