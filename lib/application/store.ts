import { mkdir, open, readdir, readFile, rm } from "fs/promises";
import path from "path";
import { firestoreAccessToken, firestoreConfigured, firestoreProjectId } from "../content/firestore";
import { atomicWriteFile } from "../content/localStore";
import {
  acceptanceError,
  BatchClosedError,
  closeBatchRecord,
  invalidateExportRecord,
  isCycleId,
  markExportedRecord,
  openBatch,
  purgeAllowed,
  type BatchRecord,
} from "./batches";
import { deleteBatchFiles } from "./blobStore";
import { DEFAULT_APPLICATION_FORM } from "@/lib/content/schema/schedule";
import { slugify } from "./normalize";
import { decodeFirestore, encodeFirestore, type FirestoreValue } from "./firestoreValues";
import { FIELD_TO_PROMOTED_LIST } from "./record";
import { unverifiedRequired } from "./documents";
import type { PromotedOption, StoredApplication, WorkflowStatus } from "./types";

export { BatchClosedError };

const root = path.join(process.cwd(), "data", "submissions");
const promotedPath = path.join(root, "promoted.json");
const batchesPath = path.join(root, "batches.json");

export class DuplicateCnicError extends Error {
  constructor() {
    super("This CNIC was already submitted for this cycle.");
    this.name = "DuplicateCnicError";
  }
}

export class StorageNotConfiguredError extends Error {
  constructor() {
    super("Application storage is not configured. Add Firestore credentials.");
    this.name = "StorageNotConfiguredError";
  }
}

function storageMode(): "firestore" | "local" | "unconfigured" {
  if (firestoreConfigured()) return "firestore";
  if (process.env.VERCEL) return "unconfigured";
  return "local";
}

function assertWritable(): "firestore" | "local" {
  const mode = storageMode();
  if (mode === "unconfigured") throw new StorageNotConfiguredError();
  return mode;
}

function applicationPath(id: string): string {
  if (!/^[\w-]+$/.test(id)) throw new Error("Invalid application id.");
  return path.join(root, `${id}.json`);
}

function keyPath(cycleCnic: string): string {
  return path.join(root, "keys", cycleCnic);
}

async function exclusiveKey(cycleCnic: string, applicationId: string): Promise<void> {
  const file = keyPath(cycleCnic);
  await mkdir(path.dirname(file), { recursive: true });
  try {
    const handle = await open(file, "wx");
    await handle.writeFile(applicationId, "utf8");
    await handle.close();
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") {
      throw new DuplicateCnicError();
    }
    throw error;
  }
}

export async function loadPromoted(): Promise<PromotedOption[]> {
  const mode = storageMode();
  if (mode === "unconfigured") return [];
  if (mode === "firestore") return loadPromotedFirestore();
  return loadPromotedFile();
}

async function loadPromotedFile(): Promise<PromotedOption[]> {
  try {
    const raw = await readFile(promotedPath, "utf8");
    const parsed = JSON.parse(raw) as { options?: PromotedOption[] };
    return Array.isArray(parsed.options) ? parsed.options : [];
  } catch {
    return [];
  }
}

async function savePromotedFile(options: PromotedOption[]): Promise<void> {
  await atomicWriteFile(promotedPath, `${JSON.stringify({ options }, null, 2)}\n`);
}

function baseUrl(): string {
  return `https://firestore.googleapis.com/v1/projects/${firestoreProjectId()}/databases/(default)/documents`;
}

async function authorized(url: string, init?: RequestInit): Promise<Response> {
  const token = await firestoreAccessToken();
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

async function loadPromotedFirestore(): Promise<PromotedOption[]> {
  const response = await authorized(`${baseUrl()}/applicationMeta/promoted`);
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`Could not read promoted options (${response.status}).`);
  const body = (await response.json()) as { fields?: Record<string, FirestoreValue> };
  const decoded = decodeFirestore({ mapValue: { fields: body.fields ?? {} } }) as { options?: PromotedOption[] };
  return Array.isArray(decoded.options) ? decoded.options : [];
}

async function savePromotedFirestore(options: PromotedOption[]): Promise<void> {
  const fields = encodeFirestore({ options });
  if (!("mapValue" in fields)) throw new Error("Promoted options could not be encoded.");
  const body = JSON.stringify({ fields: fields.mapValue.fields });
  const response = await authorized(`${baseUrl()}/applicationMeta/promoted`, { method: "PATCH", body });
  if (response.status === 404) {
    const created = await authorized(`${baseUrl()}/applicationMeta?documentId=promoted`, {
      method: "POST",
      body,
    });
    if (!created.ok) throw new Error(`Could not save promoted options (${created.status}).`);
    return;
  }
  if (!response.ok) throw new Error(`Could not save promoted options (${response.status}).`);
}

export async function saveSubmission(application: StoredApplication): Promise<void> {
  await assertBatchOpen(application.cycle);
  if (assertWritable() === "firestore") {
    await createKeyFirestore(application);
    try {
      await createApplicationFirestore(application);
    } catch (error) {
      await deleteKeyFirestore(application.cycle_cnic);
      throw error;
    }
    return;
  }
  await exclusiveKey(application.cycle_cnic, application.id);
  try {
    await atomicWriteFile(applicationPath(application.id), `${JSON.stringify(application, null, 2)}\n`);
  } catch (error) {
    await rm(keyPath(application.cycle_cnic), { force: true });
    throw error;
  }
}

async function createKeyFirestore(application: StoredApplication): Promise<void> {
  const encoded = encodeFirestore({ application_id: application.id, created_at: application.submitted_at });
  if (!("mapValue" in encoded)) throw new Error("Key could not be encoded.");
  const response = await authorized(
    `${baseUrl()}/applicationKeys?documentId=${encodeURIComponent(application.cycle_cnic)}`,
    { method: "POST", body: JSON.stringify({ fields: encoded.mapValue.fields }) },
  );
  if (response.status === 409) throw new DuplicateCnicError();
  if (!response.ok) throw new Error(`Could not reserve CNIC (${response.status}).`);
}

async function deleteKeyFirestore(cycleCnic: string): Promise<void> {
  await authorized(`${baseUrl()}/applicationKeys/${encodeURIComponent(cycleCnic)}`, { method: "DELETE" });
}

async function createApplicationFirestore(application: StoredApplication): Promise<void> {
  const encoded = encodeFirestore(application);
  if (!("mapValue" in encoded)) throw new Error("Application could not be encoded.");
  const response = await authorized(
    `${baseUrl()}/applications?documentId=${encodeURIComponent(application.id)}`,
    { method: "POST", body: JSON.stringify({ fields: encoded.mapValue.fields }) },
  );
  if (!response.ok) throw new Error(`Could not store application (${response.status}).`);
}

export async function listSubmissions(): Promise<StoredApplication[]> {
  const mode = assertWritable();
  const items = mode === "firestore" ? await listFirestore() : await listFiles();
  return items.sort((a, b) => (a.submitted_at < b.submitted_at ? 1 : -1));
}

async function listFiles(): Promise<StoredApplication[]> {
  let names: string[] = [];
  try {
    names = await readdir(root);
  } catch {
    return [];
  }
  const items: StoredApplication[] = [];
  for (const name of names) {
    if (!name.endsWith(".json") || name === "promoted.json") continue;
    const raw = await readFile(path.join(root, name), "utf8");
    items.push(JSON.parse(raw) as StoredApplication);
  }
  return items;
}

async function listFirestore(): Promise<StoredApplication[]> {
  const items: StoredApplication[] = [];
  let pageToken = "";
  do {
    const url = new URL(`${baseUrl()}/applications`);
    url.searchParams.set("pageSize", "200");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await authorized(url.toString());
    if (response.status === 404) return items;
    if (!response.ok) throw new Error(`Could not list applications (${response.status}).`);
    const body = (await response.json()) as {
      documents?: { fields?: Record<string, FirestoreValue> }[];
      nextPageToken?: string;
    };
    for (const document of body.documents ?? []) {
      items.push(decodeFirestore({ mapValue: { fields: document.fields ?? {} } }) as StoredApplication);
    }
    pageToken = body.nextPageToken ?? "";
  } while (pageToken);
  return items;
}

export async function getSubmission(id: string): Promise<StoredApplication | null> {
  if (assertWritable() === "firestore") {
    const response = await authorized(`${baseUrl()}/applications/${encodeURIComponent(id)}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Could not read application (${response.status}).`);
    const body = (await response.json()) as { fields?: Record<string, FirestoreValue> };
    return decodeFirestore({ mapValue: { fields: body.fields ?? {} } }) as StoredApplication;
  }
  try {
    const raw = await readFile(applicationPath(id), "utf8");
    return JSON.parse(raw) as StoredApplication;
  } catch {
    return null;
  }
}

async function writeSubmission(application: StoredApplication): Promise<void> {
  if (assertWritable() === "firestore") {
    const encoded = encodeFirestore(application);
    if (!("mapValue" in encoded)) throw new Error("Application could not be encoded.");
    const response = await authorized(`${baseUrl()}/applications/${encodeURIComponent(application.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ fields: encoded.mapValue.fields }),
    });
    if (!response.ok) throw new Error(`Could not update application (${response.status}).`);
  } else {
    await atomicWriteFile(applicationPath(application.id), `${JSON.stringify(application, null, 2)}\n`);
  }
  await clearBatchExport(application.cycle);
}

export async function reviewOtherField(
  id: string,
  field: string,
  action: "promote" | "dismiss",
): Promise<StoredApplication> {
  const application = await getSubmission(id);
  if (!application) throw new Error("Application not found.");
  const item = application.review.other_fields.find((entry) => entry.field === field);
  if (!item) throw new Error("That answer is not in the review queue.");
  if (action === "promote") {
    const list = FIELD_TO_PROMOTED_LIST[field as keyof typeof FIELD_TO_PROMOTED_LIST];
    if (!list) throw new Error("This answer stays as free text. Mark it reviewed instead.");
    await promoteOption(list, item.other_text);
  }
  item.reviewed = true;
  application.review.status = application.review.other_fields.some((entry) => !entry.reviewed)
    ? "needs_review"
    : "reviewed";
  await writeSubmission(application);
  return application;
}

const WORKFLOWS = new Set<WorkflowStatus>([
  "submitted",
  "incomplete",
  "under_review",
  "approved",
  "rejected",
  "did_not_reapply",
  "pass_out",
]);

const DOC_STATES = new Set(["pending", "verified", "rejected", "reupload"]);

export async function updateApplicationReview(
  id: string,
  patch: {
    action: "workflow" | "award" | "category" | "remark" | "document" | "flag";
    author: string;
    workflow?: string;
    award_amount?: number | null;
    export_category?: string;
    text?: string;
    slot?: string;
    index?: number;
    doc_state?: string;
    reason?: string;
    flag?: string;
    verified?: boolean;
  },
): Promise<{ application: StoredApplication; reuploadPath: string }> {
  const application = await getSubmission(id);
  if (!application) throw new Error("Application not found.");
  let reuploadPath = "";
  if (patch.action === "workflow") {
    if (!patch.workflow || !WORKFLOWS.has(patch.workflow as WorkflowStatus)) throw new Error("Choose a review status.");
    if (patch.workflow === "approved") {
      const missing = unverifiedRequired(application);
      if (missing.length > 0) {
        throw new Error(`Verify every required document first: ${missing.join(", ")}.`);
      }
    }
    application.review.workflow = patch.workflow as WorkflowStatus;
  } else if (patch.action === "award") {
    if (patch.award_amount === null || patch.award_amount === undefined) {
      application.review.award_amount = null;
      application.review.award_override = false;
    } else if (!Number.isInteger(patch.award_amount) || patch.award_amount < 0) {
      throw new Error("Enter the award as a whole number of PKR.");
    } else {
      const half = application.fee.amount === null ? 0 : Math.round(application.fee.amount / 2);
      application.review.award_amount = patch.award_amount;
      application.review.award_override = patch.award_amount !== half;
    }
  } else if (patch.action === "category") {
    const allowed = new Set(["", "medical", "nursing", "undergrads", "graduates", "post_grads", "kc", "fccu", "business", "blind"]);
    if (!allowed.has(patch.export_category ?? "")) throw new Error("Choose a category sheet.");
    application.review.export_category = patch.export_category ?? "";
  } else if (patch.action === "remark") {
    const text = patch.text?.trim() ?? "";
    if (text.length < 2 || text.length > 1000) throw new Error("Enter a remark.");
    application.review.remarks.push({ at: new Date().toISOString(), author: patch.author, text });
  } else if (patch.action === "flag") {
    if (!patch.flag) throw new Error("Choose a field.");
    application.review.verified_flags[patch.flag] = Boolean(patch.verified);
  } else if (patch.action === "document") {
    const document = application.documents.find((item) => item.slot === patch.slot && item.index === (patch.index ?? 1));
    if (!document) throw new Error("That document is not on the application.");
    if (!patch.doc_state || !DOC_STATES.has(patch.doc_state)) throw new Error("Choose Verified, Rejected, or Re-upload.");
    if ((patch.doc_state === "rejected" || patch.doc_state === "reupload") && !(patch.reason ?? "").trim()) {
      throw new Error("Enter a reason the student can act on.");
    }
    document.review_state = patch.doc_state as StoredApplication["documents"][number]["review_state"];
    document.review_reason = (patch.reason ?? "").trim();
    if (patch.doc_state === "reupload") {
      document.reupload_token = crypto.randomUUID();
      reuploadPath = `/apply/reupload?token=${document.reupload_token}`;
    }
  }
  await writeSubmission(application);
  return { application, reuploadPath };
}

export async function findReupload(token: string): Promise<{ application: StoredApplication; slot: string; index: number; reason: string } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const items = await listSubmissions();
  for (const application of items) {
    const document = application.documents.find((item) => item.reupload_token === token);
    if (document) {
      return { application, slot: document.slot, index: document.index, reason: document.review_reason };
    }
  }
  return null;
}

export async function replaceReupload(
  token: string,
  next: StoredApplication["documents"][number],
): Promise<void> {
  const found = await findReupload(token);
  if (!found) throw new Error("This re-upload link is not valid.");
  const documents = found.application.documents.map((document) =>
    document.reupload_token === token
      ? { ...next, slot: document.slot, index: document.index, review_state: "pending" as const, review_reason: "", reupload_token: "" }
      : document,
  );
  found.application.documents = documents;
  if (found.application.review.workflow === "incomplete") found.application.review.workflow = "submitted";
  await writeSubmission(found.application);
}

async function promoteOption(list: PromotedOption["list"], source: string): Promise<void> {
  const options = await loadPromoted();
  const label = source.trim();
  if (!label) throw new Error("Nothing to add.");
  if (options.some((item) => item.list === list && item.label.toLowerCase() === label.toLowerCase())) return;
  let id = slugify(label);
  const taken = new Set(options.filter((item) => item.list === list).map((item) => item.id));
  let suffix = 2;
  while (taken.has(id) || id === "other") {
    id = `${slugify(label).slice(0, 54)}_${suffix}`;
    suffix += 1;
  }
  options.push({ list, id, label, source_text: label, promoted_at: new Date().toISOString() });
  if (assertWritable() === "firestore") await savePromotedFirestore(options);
  else await savePromotedFile(options);
}

async function readStoredBatches(): Promise<BatchRecord[]> {
  if (assertWritable() === "firestore") return readBatchesFirestore();
  try {
    const raw = await readFile(batchesPath, "utf8");
    const parsed = JSON.parse(raw) as { batches?: BatchRecord[] };
    return Array.isArray(parsed.batches) ? parsed.batches.filter((item) => isCycleId(item.cycle)) : [];
  } catch {
    return [];
  }
}

async function writeStoredBatches(batches: BatchRecord[]): Promise<void> {
  if (assertWritable() === "firestore") {
    await writeBatchesFirestore(batches);
    return;
  }
  await atomicWriteFile(batchesPath, `${JSON.stringify({ batches }, null, 2)}\n`);
}

async function readBatchesFirestore(): Promise<BatchRecord[]> {
  const response = await authorized(`${baseUrl()}/applicationMeta/batches`);
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`Could not read batches (${response.status}).`);
  const body = (await response.json()) as { fields?: Record<string, FirestoreValue> };
  const decoded = decodeFirestore({ mapValue: { fields: body.fields ?? {} } }) as { batches?: BatchRecord[] };
  return Array.isArray(decoded.batches) ? decoded.batches.filter((item) => isCycleId(item.cycle)) : [];
}

async function writeBatchesFirestore(batches: BatchRecord[]): Promise<void> {
  const fields = encodeFirestore({ batches });
  if (!("mapValue" in fields)) throw new Error("Batches could not be encoded.");
  const body = JSON.stringify({ fields: fields.mapValue.fields });
  const response = await authorized(`${baseUrl()}/applicationMeta/batches`, { method: "PATCH", body });
  if (response.status === 404) {
    const created = await authorized(`${baseUrl()}/applicationMeta?documentId=batches`, { method: "POST", body });
    if (!created.ok) throw new Error(`Could not save batches (${created.status}).`);
    return;
  }
  if (!response.ok) throw new Error(`Could not save batches (${response.status}).`);
}

async function saveBatchRecord(record: BatchRecord): Promise<void> {
  const batches = await readStoredBatches();
  const next = batches.filter((item) => item.cycle !== record.cycle);
  next.push(record);
  await writeStoredBatches(next);
}

export async function listBatches(
  submissions: StoredApplication[] = [],
  activeCycle: string = DEFAULT_APPLICATION_FORM.cycleId,
): Promise<BatchRecord[]> {
  const stored = await readStoredBatches();
  const byCycle = new Map(stored.map((item) => [item.cycle, item]));
  const cycles = new Set<string>([...(isCycleId(activeCycle) ? [activeCycle] : []), ...byCycle.keys()]);
  for (const item of submissions) {
    if (isCycleId(item.cycle)) cycles.add(item.cycle);
  }
  return [...cycles].map((cycle) => byCycle.get(cycle) ?? openBatch(cycle)).sort((a, b) => (a.cycle < b.cycle ? 1 : -1));
}

async function batchOrOpen(cycle: string): Promise<BatchRecord> {
  if (!isCycleId(cycle)) throw new Error("Unknown batch.");
  const stored = await readStoredBatches();
  return stored.find((item) => item.cycle === cycle) ?? openBatch(cycle);
}

async function assertBatchOpen(cycle: string): Promise<void> {
  const message = acceptanceError(await batchOrOpen(cycle));
  if (message) throw new BatchClosedError(message);
}

export async function closeBatch(cycle: string, at = new Date().toISOString()): Promise<BatchRecord> {
  const next = closeBatchRecord(await batchOrOpen(cycle), at);
  await saveBatchRecord(next);
  return next;
}

export async function markBatchExported(cycle: string, at = new Date().toISOString()): Promise<BatchRecord> {
  const next = markExportedRecord(await batchOrOpen(cycle), at);
  await saveBatchRecord(next);
  return next;
}

export async function clearBatchExport(cycle: string): Promise<void> {
  if (!isCycleId(cycle)) return;
  const stored = await readStoredBatches();
  const current = stored.find((item) => item.cycle === cycle);
  if (!current?.exported_at) return;
  await saveBatchRecord(invalidateExportRecord(current));
}

function firestoreDocName(collection: string, id: string): string {
  return `projects/${firestoreProjectId()}/databases/(default)/documents/${collection}/${id}`;
}

async function deleteFirestoreDocs(names: string[]): Promise<void> {
  for (let index = 0; index < names.length; index += 400) {
    const writes = names.slice(index, index + 400).map((name) => ({ delete: name }));
    const response = await authorized(`${baseUrl()}:commit`, {
      method: "POST",
      body: JSON.stringify({ writes }),
    });
    if (!response.ok) throw new Error(`Could not delete batch documents (${response.status}).`);
  }
}

export async function purgeBatch(
  cycle: string,
  confirm: string,
): Promise<{ submissions: number; files: number; batch: BatchRecord }> {
  if (!isCycleId(cycle) || confirm !== cycle) throw new Error("Type the batch id to confirm.");
  const current = await batchOrOpen(cycle);
  const reason = purgeAllowed(current);
  if (reason) throw new Error(reason);
  const items = (await listSubmissions()).filter((item) => item.cycle === cycle);
  const files = await deleteBatchFiles(
    cycle,
    items.flatMap((item) =>
      item.documents
        .filter((document) => document.path && !document.reused)
        .map((document) => ({ storage: document.storage, fileId: document.file_id, path: document.path })),
    ),
  );
  if (assertWritable() === "firestore") {
    const names = items.flatMap((item) => [
      firestoreDocName("applications", item.id),
      firestoreDocName("applicationKeys", item.cycle_cnic),
    ]);
    await deleteFirestoreDocs(names);
  } else {
    for (const item of items) {
      await rm(applicationPath(item.id), { force: true });
      await rm(keyPath(item.cycle_cnic), { force: true });
    }
  }
  const batch: BatchRecord = {
    ...current,
    status: "purged",
    purged_at: new Date().toISOString(),
    purged_submissions: items.length,
    purged_files: files,
  };
  await saveBatchRecord(batch);
  return { submissions: items.length, files, batch };
}
