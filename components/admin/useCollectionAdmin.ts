"use client";

import { useCallback, useState } from "react";

type StatusKind = "ok" | "err" | "";

export function useCollectionAdmin<T>(
  initial: T,
  endpoints: { draft: string; publish: string },
  labels: { draftFile: string; publishedFile: string },
) {
  const [content, setContent] = useState(initial);
  const [status, setStatus] = useState("");
  const [statusKind, setStatusKind] = useState<StatusKind>("");
  const [busy, setBusy] = useState(false);

  const setStatusMsg = useCallback((message: string, kind: StatusKind = "") => {
    setStatus(message);
    setStatusKind(kind);
  }, []);

  async function saveDraft() {
    setBusy(true);
    setStatusMsg("Saving draft…");
    try {
      const response = await fetch(endpoints.draft, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      const data = (await response.json()) as { error?: string; updatedAt?: string };
      if (!response.ok) throw new Error(data.error || "Save failed");
      if (data.updatedAt) {
        setContent((current) => ({ ...(current as object), updatedAt: data.updatedAt }) as T);
      }
      setStatusMsg(`Draft saved to ${labels.draftFile}`, "ok");
    } catch (error) {
      setStatusMsg(error instanceof Error ? error.message : "Save failed", "err");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (
      !window.confirm(
        `Publish draft to live site? This copies ${labels.draftFile} → ${labels.publishedFile}.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setStatusMsg("Publishing…");
    try {
      const saveResponse = await fetch(endpoints.draft, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      const saveData = (await saveResponse.json()) as { error?: string };
      if (!saveResponse.ok) throw new Error(saveData.error || "Save before publish failed");

      const response = await fetch(endpoints.publish, { method: "POST" });
      const data = (await response.json()) as { error?: string; updatedAt?: string };
      if (!response.ok) throw new Error(data.error || "Publish failed");
      if (data.updatedAt) {
        setContent((current) => ({ ...(current as object), updatedAt: data.updatedAt }) as T);
      }
      setStatusMsg(`Published. Live site now uses ${labels.publishedFile}`, "ok");
    } catch (error) {
      setStatusMsg(error instanceof Error ? error.message : "Publish failed", "err");
    } finally {
      setBusy(false);
    }
  }

  return { content, setContent, status, statusKind, busy, saveDraft, publish };
}
