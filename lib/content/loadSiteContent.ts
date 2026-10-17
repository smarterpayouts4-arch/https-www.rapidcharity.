import { cache } from "react";
import { readCollection } from "./repository";
import { parseSiteContent, type SiteContent } from "./schema";

export type LoadOptions = {
  /** When true, prefer draft over published (admin preview / ?preview=1) */
  preview?: boolean;
};

const loadCached = cache(async (preview: boolean): Promise<SiteContent> => {
  const raw = await readCollection("site", preview ? "draft" : "published");
  return parseSiteContent(raw);
});

export async function loadSiteContent(options: LoadOptions = {}): Promise<SiteContent> {
  return loadCached(Boolean(options.preview));
}

/** Resolve preview from Next.js searchParams */
export function previewFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): boolean {
  if (!searchParams) return false;
  const value = searchParams.preview;
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "1" || raw === "true";
}

export async function loadDraftContent(): Promise<SiteContent> {
  return loadSiteContent({ preview: true });
}

export async function loadPublishedContent(): Promise<SiteContent> {
  return loadSiteContent({ preview: false });
}
