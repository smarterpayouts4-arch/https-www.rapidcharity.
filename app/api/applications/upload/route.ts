import { PDFDocument } from "pdf-lib";
import { NextResponse } from "next/server";
import {
  filesForApplication,
  putFile,
  rememberFile,
  safeObjectPath,
  UploadStorageError,
} from "@/lib/application/blobStore";
import { emptyChecks } from "@/lib/application/documents";
import { loadFormState } from "@/lib/application/formSettings";
import { getSubmission } from "@/lib/application/store";
import {
  MAX_FILE_BYTES,
  MAX_PDF_PAGES,
  MAX_TOTAL_BYTES,
  MIN_IMAGE_HEIGHT,
  MIN_IMAGE_WIDTH,
  readImageSize,
  sha256Hex,
  sniffType,
} from "@/lib/application/fileRules";
import { isDocSlot } from "@/lib/application/fileRules";
import type { DocumentChecks } from "@/lib/application/types";

export const dynamic = "force-dynamic";

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseChecks(raw: string): DocumentChecks {
  const base = emptyChecks();
  try {
    const value = JSON.parse(raw) as Partial<DocumentChecks>;
    return {
      ...base,
      blur_score: numberOrNull(value.blur_score),
      brightness: numberOrNull(value.brightness),
      width: numberOrNull(value.width),
      height: numberOrNull(value.height),
      page_count: numberOrNull(value.page_count),
      warnings: Array.isArray(value.warnings)
        ? value.warnings.filter((item): item is string => typeof item === "string").slice(0, 12)
        : [],
      name_score: numberOrNull(value.name_score),
      cnic_match: typeof value.cnic_match === "boolean" ? value.cnic_match : null,
      fee_extracted: numberOrNull(value.fee_extracted),
      fee_match: typeof value.fee_match === "boolean" ? value.fee_match : null,
      extracted_text: typeof value.extracted_text === "string" ? value.extracted_text.slice(0, 4000) : "",
    };
  } catch {
    return base;
  }
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "The upload could not be read." }, { status: 400 });
  }
  const applicationId = String(form.get("applicationId") ?? "");
  const slot = String(form.get("slot") ?? "");
  const index = Number(form.get("index") ?? "1");
  const file = form.get("file");
  if (!isDocSlot(slot) || !Number.isInteger(index) || index < 1 || (slot === "result" ? index > 5 : index !== 1)) {
    return NextResponse.json({ error: "Choose a document slot." }, { status: 400 });
  }
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a JPG, PNG, or PDF." }, { status: 400 });
  // Re-uploads for an existing submission stay in that submission's cycle and
  // work while the form is closed; new uploads need the form to be open.
  let uploadCycle: string;
  try {
    const existingSubmission = /^[0-9a-f-]{36}$/i.test(applicationId) ? await getSubmission(applicationId) : null;
    if (existingSubmission) {
      uploadCycle = existingSubmission.cycle;
    } else {
      const formState = await loadFormState();
      if (!formState.open) return NextResponse.json({ error: formState.closedMessage }, { status: 403 });
      uploadCycle = formState.cycleId;
    }
  } catch {
    return NextResponse.json({ error: "The upload could not be checked. Try again in a moment." }, { status: 503 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length < 32 || bytes.length > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Each file must be 5 MB or smaller." }, { status: 400 });
  }
  const mime = sniffType(bytes);
  if (mime === "reject" || mime === "image/heic") {
    return NextResponse.json(
      { error: "Use a JPG, PNG, or PDF. If this is a HEIC photo, save it as JPG and try again." },
      { status: 400 },
    );
  }
  const checks = parseChecks(String(form.get("checks") ?? ""));
  if (mime === "application/pdf") {
    try {
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: false });
      const pages = pdf.getPageCount();
      checks.page_count = pages;
      if (pages < 1 || pages > MAX_PDF_PAGES) {
        return NextResponse.json({ error: "PDFs can be at most 10 pages." }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "This PDF is password-protected or damaged." }, { status: 400 });
    }
  } else {
    const size = readImageSize(bytes, mime);
    if (!size || size.width < MIN_IMAGE_WIDTH || size.height < MIN_IMAGE_HEIGHT) {
      return NextResponse.json({ error: "This photo is smaller than 800×600. Retake it so the text can be read." }, { status: 400 });
    }
    checks.width = size.width;
    checks.height = size.height;
  }
  const sha256 = await sha256Hex(bytes);
  const existing = await filesForApplication(applicationId);
  if (existing.some((item) => item.sha256 === sha256 && item.slot !== slot)) {
    return NextResponse.json(
      { error: "This is the same file as another slot. Upload the document that belongs here." },
      { status: 400 },
    );
  }
  const replacing = existing.find((item) => item.slot === slot && item.index === index);
  const total = existing.reduce((sum, item) => sum + item.bytes, 0) - (replacing?.bytes ?? 0) + bytes.length;
  if (total > MAX_TOTAL_BYTES) {
    return NextResponse.json({ error: "All files together must be 25 MB or smaller." }, { status: 400 });
  }
  let relative: string;
  try {
    relative = safeObjectPath(applicationId, slot, index, mime, uploadCycle);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The file could not be stored.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  try {
    const stored = await putFile(relative, bytes, mime);
    const noted = await rememberFile({
      sha256,
      applicationId,
      slot,
      index,
      path: stored.path,
      mime,
      bytes: bytes.length,
      provider: stored.provider,
      fileId: stored.id,
      url: stored.url,
    });
    checks.duplicate_across = noted.duplicateAcross;
    if (noted.duplicateAcross) {
      checks.warnings = [...checks.warnings, "This file also appears on another application. A reviewer will check it."].slice(0, 12);
    }
    return NextResponse.json({
      document: {
        slot,
        index,
        storage: stored.provider,
        file_id: stored.id,
        path: stored.path,
        url: stored.url,
        mime,
        bytes: bytes.length,
        sha256,
        checks,
        reused: false,
      },
    });
  } catch (error) {
    if (error instanceof UploadStorageError) return NextResponse.json({ error: error.message }, { status: 503 });
    return NextResponse.json({ error: "The file could not be stored." }, { status: 500 });
  }
}
