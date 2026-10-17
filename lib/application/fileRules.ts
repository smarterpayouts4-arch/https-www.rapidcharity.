export const MAX_FILE_BYTES = 5 * 1024 * 1024;
/** Scholarship portal limit for the passport-size photo. The browser resizes larger photos before upload. */
export const MAX_PHOTO_BYTES = 500 * 1024;
/** The photo is resized to fit inside this square (600 x 600, as the portal recommends). */
export const PHOTO_MAX_SIDE = 600;
export const PHOTO_MIN_SIDE = 200;
export const MAX_TOTAL_BYTES = 25 * 1024 * 1024;
export const MAX_PDF_PAGES = 10;
export const MIN_IMAGE_WIDTH = 800;
export const MIN_IMAGE_HEIGHT = 600;

const DOC_SLOTS = [
  "photo",
  "cnic",
  "guardian_cnic",
  "admission_proof",
  "result",
  "fee_voucher",
  "pastor_letter",
  "income_proof",
  "disability_certificate",
  "other_award",
  "education_proof",
] as const;

export type DocSlot = (typeof DOC_SLOTS)[number];

export function isDocSlot(value: string): value is DocSlot {
  return (DOC_SLOTS as readonly string[]).includes(value);
}

export type SniffedType = "image/jpeg" | "image/png" | "application/pdf" | "image/heic" | "reject";

export function sniffType(bytes: Uint8Array): SniffedType {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return "application/pdf";
  }
  if (bytes.length >= 12 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    const brand = String.fromCharCode(bytes[8] ?? 0, bytes[9] ?? 0, bytes[10] ?? 0, bytes[11] ?? 0).toLowerCase();
    // heic, heix, heim, heis, hevc, hevx, and the generic HEIF brands mif1 / msf1.
    if (brand.startsWith("hei") || brand.startsWith("hev") || brand === "mif1" || brand === "msf1") return "image/heic";
  }
  return "reject";
}

export function extensionFor(mime: SniffedType): "jpg" | "png" | "pdf" | "" {
  if (mime === "image/jpeg" || mime === "image/heic") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "application/pdf") return "pdf";
  return "";
}

export function readImageSize(bytes: Uint8Array, mime: SniffedType): { width: number; height: number } | null {
  if (mime === "image/png" && bytes.length >= 24) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (mime !== "image/jpeg") return null;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1] ?? 0;
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      const height = ((bytes[offset + 5] ?? 0) << 8) + (bytes[offset + 6] ?? 0);
      const width = ((bytes[offset + 7] ?? 0) << 8) + (bytes[offset + 8] ?? 0);
      return { width, height };
    }
    const length = ((bytes[offset + 2] ?? 0) << 8) + (bytes[offset + 3] ?? 0);
    if (length < 2) break;
    offset += 2 + length;
  }
  return null;
}

export function imageStats(pixels: { data: Uint8ClampedArray | Uint8Array; width: number; height: number }): {
  blur: number;
  brightness: number;
} {
  const { data, width, height } = pixels;
  let laplacian = 0;
  let laplacianSq = 0;
  let brightness = 0;
  let count = 0;
  const step = 2;
  for (let y = step; y < height - step; y += step) {
    for (let x = step; x < width - step; x += step) {
      const at = (px: number, py: number) => {
        const index = (py * width + px) * 4;
        return 0.299 * (data[index] ?? 0) + 0.587 * (data[index + 1] ?? 0) + 0.114 * (data[index + 2] ?? 0);
      };
      const center = at(x, y);
      const lap = 4 * center - at(x - step, y) - at(x + step, y) - at(x, y - step) - at(x, y + step);
      laplacian += lap;
      laplacianSq += lap * lap;
      brightness += center;
      count += 1;
    }
  }
  if (count === 0) return { blur: 0, brightness: 0 };
  const mean = laplacian / count;
  return { blur: laplacianSq / count - mean * mean, brightness: brightness / count };
}

export function readabilityIssue(stats: {
  width: number;
  height: number;
  blur: number;
  brightness: number;
}): string | null {
  if (stats.width < MIN_IMAGE_WIDTH || stats.height < MIN_IMAGE_HEIGHT) {
    return "This photo is smaller than 800×600. Retake it so the writing can be read.";
  }
  if (stats.brightness < 18) return "This photo is too dark. Retake it in daylight.";
  if (stats.blur < 12) return "This photo is blank or unreadable. Retake it in daylight.";
  return null;
}

export function blurWarning(blur: number): string | null {
  if (blur < 55) return "This photo looks blurry. Retake it in daylight if the text is hard to read.";
  return null;
}

export function feeWithinTolerance(typed: number, extracted: number, tolerance = 0.02): boolean {
  if (!Number.isFinite(typed) || typed <= 0 || !Number.isFinite(extracted)) return false;
  return Math.abs(extracted - typed) / typed <= tolerance + 1e-9;
}

export function extractFeeAmount(text: string): number | null {
  const matches = text.replace(/,/g, "").match(/\b\d{3,7}\b/g);
  if (!matches) return null;
  const amounts = matches.map(Number).filter((value) => value >= 1000 && value <= 5_000_000);
  if (amounts.length === 0) return null;
  return Math.max(...amounts);
}

export function extractCnicDigits(text: string): string | null {
  const dashed = text.match(/\b(\d{5})[-\s]?(\d{7})[-\s]?(\d)\b/);
  if (dashed) return `${dashed[1]}${dashed[2]}${dashed[3]}`;
  const digits = text.replace(/\D/g, "");
  const found = digits.match(/(\d{13})/);
  return found?.[1] ?? null;
}

function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function levenshtein(left: string, right: string): number {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let previous = i - 1;
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const current = row[j] ?? 0;
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      row[j] = Math.min((row[j] ?? 0) + 1, (row[j - 1] ?? 0) + 1, previous + cost);
      previous = current;
    }
  }
  return row[right.length] ?? 0;
}

export function nameSimilarity(left: string, right: string): number {
  const a = fold(left);
  const b = fold(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const distance = levenshtein(a, b);
  return 1 - distance / Math.max(a.length, b.length);
}

/** 1 when every word of the typed name is present, with one-character typos allowed. */
export function textContainsName(text: string, name: string): number {
  const words = fold(name).split(" ").filter((word) => word.length > 1);
  if (words.length === 0) return 0;
  const haystack = fold(text);
  const tokens = haystack.split(" ").filter(Boolean);
  let hits = 0;
  for (const word of words) {
    if (haystack.includes(word)) {
      hits += 1;
      continue;
    }
    if (tokens.some((token) => nameSimilarity(token, word) >= 0.85)) hits += 1;
  }
  return hits / words.length;
}

export function keywordWarnings(slot: string, text: string): string[] {
  const folded = text.toLowerCase();
  if (!folded.trim()) return ["No text could be read. A reviewer will check this file."];
  if (folded.includes("whatsapp")) {
    return ["This looks like a chat screenshot. Upload the original document."];
  }
  if ((slot === "cnic" || slot === "guardian_cnic") && !/identity|islamic republic|b-form|nadra|cnic/.test(folded)) {
    return ["This file does not look like a CNIC or B-Form. A reviewer will check it."];
  }
  if (slot === "fee_voucher" && !/challan|voucher|fee|due date|payable/.test(folded)) {
    return ["This file does not look like a fee voucher. A reviewer will check it."];
  }
  if (slot === "result" && !/gpa|cgpa|marks|semester|grade|transcript|result/.test(folded)) {
    return ["This file does not look like a result card. A reviewer will check it."];
  }
  if (slot === "pastor_letter" && !/church|recommend|pastor|priest|sincerely|bless/.test(folded)) {
    return ["This file does not look like a recommendation letter. A reviewer will check it."];
  }
  return [];
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const copy = Uint8Array.from(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
