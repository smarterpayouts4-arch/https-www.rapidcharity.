import { existsSync, readFileSync } from "fs";
import { firestoreCommit, firestoreConfigured, firestoreGet, firestoreSet } from "./firestore";
import { atomicWriteFile, publishFiles } from "./localStore";
import {
  BLOG_DRAFT_PATH,
  BLOG_PUBLISHED_PATH,
  DRAFT_PATH,
  EVENTS_DRAFT_PATH,
  EVENTS_PUBLISHED_PATH,
  PUBLISHED_PATH,
} from "./paths";

export type CollectionName = "site" | "blog" | "events";
export type ContentSlot = "draft" | "published";

const LOCAL_PATHS: Record<CollectionName, Record<ContentSlot, string>> = {
  site: { draft: DRAFT_PATH, published: PUBLISHED_PATH },
  blog: { draft: BLOG_DRAFT_PATH, published: BLOG_PUBLISHED_PATH },
  events: { draft: EVENTS_DRAFT_PATH, published: EVENTS_PUBLISHED_PATH },
};

export const FIRESTORE_DOCS: Record<CollectionName, Record<ContentSlot, string>> = {
  site: { draft: "siteDraft", published: "site" },
  blog: { draft: "blogDraft", published: "blog" },
  events: { draft: "eventsDraft", published: "events" },
};

function readFileJson(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
}

export function readLocalCollection(name: CollectionName, slot: ContentSlot): unknown {
  const paths = LOCAL_PATHS[name];
  if (slot === "draft" && existsSync(paths.draft)) return readFileJson(paths.draft);
  if (!existsSync(paths.published)) {
    throw new Error(`Site content missing at ${paths.published}.`);
  }
  return readFileJson(paths.published);
}

export function localDraftExists(name: CollectionName): boolean {
  return existsSync(LOCAL_PATHS[name].draft);
}

function assertWritable(): void {
  if (process.env.VERCEL === "1" && !firestoreConfigured()) {
    throw new Error(
      "Firestore is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY so content can be saved on Vercel.",
    );
  }
}

export function serializeContent(data: unknown): string {
  return `${JSON.stringify(data, null, 2)}\n`;
}

export async function readCollection(name: CollectionName, slot: ContentSlot): Promise<unknown> {
  if (firestoreConfigured()) {
    try {
      const remote = await firestoreGet(FIRESTORE_DOCS[name][slot]);
      if (remote !== null) return remote;
    } catch (error) {
      console.error(`[content] Firestore read failed for ${name}/${slot}`, error);
    }
  }
  return readLocalCollection(name, slot);
}

export async function readDraftForPublish(name: CollectionName): Promise<unknown> {
  if (firestoreConfigured()) {
    const remote = await firestoreGet(FIRESTORE_DOCS[name].draft);
    if (remote === null) throw new Error("No draft to publish. Save a draft first.");
    return remote;
  }
  if (!localDraftExists(name)) throw new Error("No draft to publish. Save a draft first.");
  return readLocalCollection(name, "draft");
}

export async function saveDraft(name: CollectionName, data: unknown): Promise<void> {
  if (firestoreConfigured()) {
    await firestoreSet(FIRESTORE_DOCS[name].draft, data);
    return;
  }
  assertWritable();
  await atomicWriteFile(LOCAL_PATHS[name].draft, serializeContent(data));
}

export async function publishCollection(name: CollectionName, data: unknown): Promise<void> {
  const json = serializeContent(data);
  const updatedAt =
    data && typeof data === "object" && "updatedAt" in data && typeof data.updatedAt === "string"
      ? data.updatedAt
      : new Date().toISOString();
  if (firestoreConfigured()) {
    await firestoreCommit([
      { id: FIRESTORE_DOCS[name].published, json, updatedAt },
      { id: FIRESTORE_DOCS[name].draft, json, updatedAt },
    ]);
    return;
  }
  assertWritable();
  const paths = LOCAL_PATHS[name];
  await publishFiles(paths.draft, paths.published, json);
}

export function storageMode(): "firestore" | "local-files" {
  return firestoreConfigured() ? "firestore" : "local-files";
}
