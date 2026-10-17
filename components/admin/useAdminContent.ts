"use client";

import { useCallback, useState } from "react";
import type { SiteContent } from "@/lib/content/schema";
import type { ContentPath } from "./config";
import { setContentAtPath } from "./contentPath";

type StatusKind = "ok" | "err" | "";

export function useAdminContent(initial: SiteContent) {
  const [content, setContent] = useState(initial);
  const [status, setStatus] = useState("");
  const [statusKind, setStatusKind] = useState<StatusKind>("");
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);

  const setStatusMsg = useCallback((message: string, kind: StatusKind = "") => {
    setStatus(message); setStatusKind(kind);
  }, []);
  const change = useCallback((path: ContentPath, value: unknown) => {
    setContent((previous) => setContentAtPath(previous, path, value));
  }, []);

  async function saveContent(): Promise<string | undefined> {
    const response = await fetch("/api/admin/content", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(content),
    });
    const data = (await response.json()) as { error?: string; updatedAt?: string };
    if (!response.ok) throw new Error(data.error || "Save failed");
    if (data.updatedAt) setContent((current) => ({ ...current, updatedAt: data.updatedAt }));
    return data.updatedAt;
  }

  async function saveDraft() {
    setBusy(true); setStatusMsg("Saving draft…");
    try { await saveContent(); setStatusMsg("Draft saved to content/site.draft.json", "ok"); }
    catch (error) { setStatusMsg(error instanceof Error ? error.message : "Save failed", "err"); }
    finally { setBusy(false); }
  }

  async function publish() {
    if (!window.confirm("Publish draft to live site? This copies site.draft.json → site.json.")) return;
    setBusy(true); setStatusMsg("Publishing…");
    try {
      await saveContent();
      const response = await fetch("/api/admin/publish", { method: "POST" });
      const data = (await response.json()) as { error?: string; updatedAt?: string };
      if (!response.ok) throw new Error(data.error || "Publish failed");
      if (data.updatedAt) setContent((current) => ({ ...current, updatedAt: data.updatedAt }));
      setStatusMsg("Published. Live site now uses this content", "ok");
    } catch (error) { setStatusMsg(error instanceof Error ? error.message : "Publish failed", "err"); }
    finally { setBusy(false); }
  }

  async function uploadVideo(file: File | null) {
    if (!file) return;
    setUploadBusy(true); setStatusMsg(`Uploading ${file.name}…`);
    try {
      const form = new FormData(); form.append("file", file);
      const response = await fetch("/api/admin/upload-video", { method: "POST", body: form });
      const data = (await response.json()) as { path?: string; error?: string };
      if (!response.ok || !data.path) throw new Error(data.error || "Upload failed");
      change(["missionOverview", "video", "src"], data.path);
      setStatusMsg(`Video saved. Path set to ${data.path}. Save draft to keep.`, "ok");
    } catch (error) { setStatusMsg(error instanceof Error ? error.message : "Upload failed", "err"); }
    finally { setUploadBusy(false); }
  }

  return { content, change, status, statusKind, busy, uploadBusy, saveDraft, publish, uploadVideo };
}
