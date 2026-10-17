import type { ApplicationInput } from "./types";

export const DRAFT_KEY = "rapid-application-draft-v1";

export type ApplicationDraft = {
  data: ApplicationInput;
  step: number;
  savedAt: string;
};

export function readDraft(): ApplicationDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ApplicationDraft;
    if (!parsed?.data || typeof parsed.step !== "number" || !parsed.savedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeDraft(draft: ApplicationDraft) {
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function clearDraft() {
  window.localStorage.removeItem(DRAFT_KEY);
}

export function savedAgo(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "recently";
  const minutes = Math.max(0, Math.round((now - then) / 60000));
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours === 1) return "1 hour ago";
  if (hours < 48) return `${hours} hours ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}
