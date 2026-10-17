import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { atomicWriteFile } from "../content/localStore";
import { DEFAULT_APPLICATION_FORM } from "@/lib/content/schema/schedule";
import { extensionFor, isDocSlot, type SniffedType } from "./fileRules";

export type StorageName = "google-drive" | "cloudinary" | "local";

export type StoredFile = {
  provider: StorageName;
  id: string;
  path: string;
  url: string;
};

export class UploadStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadStorageError";
  }
}

/** True when uploaded files have somewhere to go (Drive, Cloudinary, or local files outside Vercel). */
export function documentStorageReady(): boolean {
  try {
    storageProvider();
    return true;
  } catch {
    return false;
  }
}

export function storageProvider(): StorageName {
  if (process.env.GOOGLE_DRIVE_UPLOAD_URL && process.env.GOOGLE_DRIVE_UPLOAD_SECRET) return "google-drive";
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    return "cloudinary";
  }
  if (process.env.VERCEL) {
    throw new UploadStorageError(
      "Document storage is not configured. Add the Google Drive Apps Script URL or Cloudinary keys.",
    );
  }
  return "local";
}

const uploadRoot = path.join(process.cwd(), "data", "uploads");
const manifestPath = path.join(uploadRoot, "manifest.json");

export type ManifestEntry = {
  sha256: string;
  applicationId: string;
  slot: string;
  index: number;
  path: string;
  mime: string;
  bytes: number;
  provider: StorageName;
  fileId: string;
  url: string;
};

let manifestChain: Promise<void> = Promise.resolve();

function enqueueManifest<T>(task: () => Promise<T>): Promise<T> {
  const run = manifestChain.then(task, task);
  manifestChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readManifest(): Promise<ManifestEntry[]> {
  try {
    const raw = await readFile(manifestPath, "utf8");
    const parsed = JSON.parse(raw) as { files?: ManifestEntry[] };
    return Array.isArray(parsed.files) ? parsed.files : [];
  } catch {
    return [];
  }
}

async function writeManifest(files: ManifestEntry[]): Promise<void> {
  await mkdir(uploadRoot, { recursive: true });
  await atomicWriteFile(manifestPath, `${JSON.stringify({ files }, null, 2)}\n`);
}

export function safeObjectPath(
  applicationId: string,
  slot: string,
  index: number,
  mime: SniffedType,
  cycle: string = DEFAULT_APPLICATION_FORM.cycleId,
): string {
  assertCycle(cycle);
  if (!/^[0-9a-f-]{36}$/i.test(applicationId)) throw new UploadStorageError("Invalid application id.");
  if (!isDocSlot(slot)) throw new UploadStorageError("Unknown document type.");
  if (!Number.isInteger(index) || index < 1 || index > 6) throw new UploadStorageError("Invalid file number.");
  const extension = extensionFor(mime);
  if (!extension || mime === "image/heic") throw new UploadStorageError("Save HEIC photos as JPG before storing.");
  return `${cycle}/${applicationId}/${slot}-${index}.${extension}`;
}

export async function filesForApplication(applicationId: string): Promise<ManifestEntry[]> {
  const files = await readManifest();
  return files.filter((item) => item.applicationId === applicationId);
}

export async function rememberFile(entry: ManifestEntry): Promise<{ duplicateAcross: boolean }> {
  return enqueueManifest(async () => {
    const files = await readManifest();
    const duplicateAcross = files.some((item) => item.sha256 === entry.sha256 && item.applicationId !== entry.applicationId);
    const sameSlot = files.find(
      (item) => item.applicationId === entry.applicationId && item.slot === entry.slot && item.index === entry.index,
    );
    const next = files.filter(
      (item) => !(item.applicationId === entry.applicationId && item.slot === entry.slot && item.index === entry.index),
    );
    next.push(entry);
    await writeManifest(next);
    if (sameSlot && sameSlot.path !== entry.path && sameSlot.provider === "local") {
      await rm(path.join(uploadRoot, sameSlot.path), { force: true });
    }
    return { duplicateAcross };
  });
}

export async function assertOwnedFiles(
  applicationId: string,
  documents: { path: string; sha256: string; reused: boolean }[],
): Promise<string | null> {
  const files = await filesForApplication(applicationId);
  for (const document of documents) {
    if (document.reused) continue;
    if (!document.path) return "Upload each document again before submitting. A file is missing from storage.";
    const found = files.some((item) => item.path === document.path && item.sha256 === document.sha256);
    if (!found) return "Upload each document again before submitting. A file is missing from storage.";
  }
  return null;
}

export async function findByHash(sha256: string, applicationId: string): Promise<ManifestEntry | null> {
  const files = await readManifest();
  return files.find((item) => item.sha256 === sha256 && item.applicationId === applicationId) ?? null;
}

async function putLocal(relativePath: string, bytes: Buffer): Promise<StoredFile> {
  const full = path.join(uploadRoot, relativePath);
  if (!full.startsWith(uploadRoot)) throw new UploadStorageError("Invalid path.");
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, bytes);
  return { provider: "local", id: relativePath, path: relativePath, url: "" };
}

async function putDrive(relativePath: string, bytes: Buffer, mime: string): Promise<StoredFile> {
  const endpoint = process.env.GOOGLE_DRIVE_UPLOAD_URL ?? "";
  const secret = process.env.GOOGLE_DRIVE_UPLOAD_SECRET ?? "";
  const folder = path.posix.dirname(relativePath);
  const filename = path.posix.basename(relativePath);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret,
      path: folder,
      filename,
      mime,
      data: bytes.toString("base64"),
    }),
  });
  if (!response.ok) throw new UploadStorageError("Google Drive did not accept the file.");
  const body = (await response.json()) as { ok?: boolean; id?: string; url?: string };
  if (!body.ok || !body.id) throw new UploadStorageError("Google Drive did not return a file id.");
  return { provider: "google-drive", id: body.id, path: relativePath, url: body.url ?? "" };
}

function cloudinarySignature(params: Record<string, string>, secret: string): string {
  const serialized = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(serialized + secret).digest("hex");
}

async function putCloudinary(relativePath: string, bytes: Buffer, mime: string): Promise<StoredFile> {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME ?? "";
  const apiKey = process.env.CLOUDINARY_API_KEY ?? "";
  const secret = process.env.CLOUDINARY_API_SECRET ?? "";
  const folder = path.posix.dirname(relativePath);
  const publicId = path.posix.basename(relativePath).replace(/\.[^.]+$/, "");
  const timestamp = String(Math.floor(Date.now() / 1000));
  const params = { folder, public_id: publicId, timestamp, type: "authenticated" };
  const signature = cloudinarySignature(params, secret);
  const form = new FormData();
  form.set("file", new Blob([Uint8Array.from(bytes)], { type: mime }), path.posix.basename(relativePath));
  form.set("api_key", apiKey);
  form.set("timestamp", timestamp);
  form.set("folder", folder);
  form.set("public_id", publicId);
  form.set("type", "authenticated");
  form.set("signature", signature);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/auto/upload`, { method: "POST", body: form });
  if (!response.ok) throw new UploadStorageError("Cloudinary did not accept the file.");
  const body = (await response.json()) as { public_id?: string; secure_url?: string };
  if (!body.public_id) throw new UploadStorageError("Cloudinary did not return a file id.");
  return {
    provider: "cloudinary",
    id: body.public_id,
    path: relativePath,
    url: body.secure_url ?? "",
  };
}

export async function putFile(relativePath: string, bytes: Buffer, mime: string): Promise<StoredFile> {
  const provider = storageProvider();
  if (provider === "google-drive") return putDrive(relativePath, bytes, mime);
  if (provider === "cloudinary") return putCloudinary(relativePath, bytes, mime);
  return putLocal(relativePath, bytes);
}

export async function readLocalFile(relativePath: string): Promise<Buffer> {
  if (relativePath.includes("..") || path.isAbsolute(relativePath)) throw new UploadStorageError("Invalid path.");
  const full = path.join(uploadRoot, relativePath);
  return readFile(full);
}

export type BatchFileRef = {
  storage: StorageName;
  fileId: string;
  path: string;
};

function assertCycle(cycle: string): void {
  if (!/^(spring|fall)-\d{4}$/.test(cycle)) throw new UploadStorageError("Unknown batch.");
}

async function deleteDrive(cycle: string, fileIds: string[]): Promise<number> {
  const endpoint = process.env.GOOGLE_DRIVE_UPLOAD_URL ?? "";
  const secret = process.env.GOOGLE_DRIVE_UPLOAD_SECRET ?? "";
  if (!endpoint || !secret) {
    if (fileIds.length > 0) {
      throw new UploadStorageError("Google Drive is not configured, so this batch's files cannot be deleted.");
    }
    return 0;
  }
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, action: "delete", path: cycle, fileIds }),
  });
  if (!response.ok) throw new UploadStorageError("Google Drive did not delete the batch files.");
  const body = (await response.json()) as { ok?: boolean; removed?: number };
  if (!body.ok) throw new UploadStorageError("Google Drive did not delete the batch files.");
  return body.removed ?? fileIds.length;
}

async function destroyCloudinary(publicId: string): Promise<void> {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME ?? "";
  const apiKey = process.env.CLOUDINARY_API_KEY ?? "";
  const secret = process.env.CLOUDINARY_API_SECRET ?? "";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const params = { invalidate: "true", public_id: publicId, timestamp, type: "authenticated" };
  const signature = cloudinarySignature(params, secret);
  let removed = false;
  for (const kind of ["image", "raw", "video"]) {
    const form = new FormData();
    form.set("public_id", publicId);
    form.set("timestamp", timestamp);
    form.set("type", "authenticated");
    form.set("invalidate", "true");
    form.set("api_key", apiKey);
    form.set("signature", signature);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/${kind}/destroy`, {
      method: "POST",
      body: form,
    });
    if (!response.ok) continue;
    const body = (await response.json()) as { result?: string };
    if (body.result === "ok" || body.result === "not found") {
      removed = true;
      break;
    }
  }
  if (!removed) throw new UploadStorageError("Cloudinary did not delete a batch file.");
}

async function deleteCloudinary(cycle: string, publicIds: string[]): Promise<void> {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME ?? "";
  const apiKey = process.env.CLOUDINARY_API_KEY ?? "";
  const secret = process.env.CLOUDINARY_API_SECRET ?? "";
  if (!cloud || !apiKey || !secret) {
    if (publicIds.length > 0) {
      throw new UploadStorageError("Cloudinary is not configured, so this batch's files cannot be deleted.");
    }
    return;
  }
  if (publicIds.length === 0) return;
  const auth = Buffer.from(`${apiKey}:${secret}`).toString("base64");
  for (const resourceType of ["image", "raw", "video"]) {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloud}/resources/${resourceType}/authenticated`,
      {
        method: "DELETE",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prefix: `${cycle}/` }),
      },
    );
    if (response.ok || response.status === 404 || response.status === 400) continue;
    throw new UploadStorageError("Cloudinary did not delete the batch files.");
  }
  for (const publicId of publicIds) await destroyCloudinary(publicId);
}

/** Deletes a batch folder from disk and from Drive or Cloudinary when those files exist. */
export async function deleteBatchFiles(cycle: string, refs: BatchFileRef[]): Promise<number> {
  assertCycle(cycle);
  const manifest = await readManifest();
  const prefix = `${cycle}/`;
  const listed = manifest.filter((item) => item.path.startsWith(prefix));
  const driveIds = new Set<string>();
  const cloudIds = new Set<string>();
  for (const item of listed) {
    if (item.provider === "google-drive" && item.fileId) driveIds.add(item.fileId);
    if (item.provider === "cloudinary" && item.fileId) cloudIds.add(item.fileId);
  }
  for (const ref of refs) {
    if (ref.storage === "google-drive" && ref.fileId) driveIds.add(ref.fileId);
    if (ref.storage === "cloudinary" && ref.fileId) cloudIds.add(ref.fileId);
  }
  const driveRemoved = await deleteDrive(cycle, [...driveIds]);
  await deleteCloudinary(cycle, [...cloudIds]);
  await rm(path.join(uploadRoot, cycle), { recursive: true, force: true });
  await enqueueManifest(async () => {
    const latest = await readManifest();
    await writeManifest(latest.filter((item) => !item.path.startsWith(prefix)));
  });
  return Math.max(listed.length, refs.filter((item) => item.path.startsWith(prefix)).length, driveRemoved);
}
