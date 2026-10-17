"use client";

import { prepareFile, type PreparedFile } from "@/lib/application/prepareFile";
import { LOCAL_SAMPLE_PREFIX } from "@/lib/application/sampleDocuments";
import type { DocumentInput } from "@/lib/application/types";

export type UploadContext = { name: string; cnic: string; fatherName: string; fee: number | null };

export type UploadResult =
  | { ok: true; document: DocumentInput; prepared: PreparedFile; localSample: boolean }
  | { ok: false; error: string; code?: string };

/** Code the upload route returns when storage is not configured. */
export const UPLOADS_UNAVAILABLE = "uploads_unavailable";

function postFile(form: FormData, onProgress?: (percent: number) => void): Promise<{ status: number; body: { document?: DocumentInput; error?: string; code?: string } }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/applications/upload");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      try {
        resolve({ status: xhr.status, body: JSON.parse(xhr.responseText) });
      } catch {
        reject(new Error("The file was not accepted."));
      }
    };
    xhr.onerror = () => reject(new Error("The file could not be uploaded."));
    xhr.send(form);
  });
}

async function sha256Hex(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Sample mode only: a SAMPLE file kept in the browser because storage is not
 * set up. It passes the form checks so the flow reaches Review, shows as
 * "Sample file (not uploaded)", and the submit route refuses it.
 */
export async function localSampleDocument(prepared: PreparedFile, slot: string, index: number, name: string): Promise<DocumentInput> {
  return {
    slot,
    index,
    storage: "local",
    file_id: `${LOCAL_SAMPLE_PREFIX}${name}`,
    path: "",
    url: "",
    mime: prepared.blob.type || "image/jpeg",
    bytes: prepared.blob.size,
    sha256: await sha256Hex(prepared.blob),
    checks: prepared.checks,
    reused: false,
  };
}

/**
 * Checks, resizes and uploads one file for a slot. With `sampleFallback`, a
 * SAMPLE file that cannot be uploaded because storage is not configured is
 * attached in the browser instead.
 */
export async function uploadDocument(options: {
  applicationId: string;
  slot: string;
  index: number;
  file: File;
  context: UploadContext;
  sampleFallback?: boolean;
  onProgress?: (percent: number) => void;
}): Promise<UploadResult> {
  const { applicationId, slot, index, file, context } = options;
  const prepared = await prepareFile(file, { slot, ...context });
  const form = new FormData();
  form.set("applicationId", applicationId);
  form.set("slot", slot);
  form.set("index", String(index));
  form.set("checks", JSON.stringify(prepared.checks));
  form.set("file", prepared.blob, prepared.name);
  options.onProgress?.(20);
  const { status, body } = await postFile(form, (percent) => options.onProgress?.(Math.max(20, percent)));
  if (status >= 200 && status < 300 && body.document) return { ok: true, document: body.document, prepared, localSample: false };
  if (options.sampleFallback && body.code === UPLOADS_UNAVAILABLE) {
    return { ok: true, document: await localSampleDocument(prepared, slot, index, file.name), prepared, localSample: true };
  }
  return { ok: false, error: body.error || "The file was not accepted.", code: body.code };
}

/** Fetches a SAMPLE fixture through the gated dev route. */
export async function fetchSampleFile(name: string, headers: HeadersInit): Promise<File> {
  const response = await fetch(`/api/dev/sample-documents?file=${encodeURIComponent(name)}`, { headers, cache: "no-store" });
  if (!response.ok) throw new Error(`Sample file ${name} is not available.`);
  const blob = await response.blob();
  return new File([blob], name, { type: blob.type });
}

/** Small square JPEG data URL (center crop) for the circular previews. */
export async function circleThumb(blob: Blob, size = 192): Promise<string> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return "";
  }
  const side = Math.min(bitmap.width, bitmap.height);
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}
