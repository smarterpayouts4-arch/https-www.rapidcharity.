"use client";

import { useState } from "react";
import styles from "@/app/apply/form/form.module.css";
import { prepareFile } from "@/lib/application/prepareFile";
import type { DocumentInput } from "@/lib/application/types";

export function ReuploadForm({
  token,
  applicationId,
  slot,
  index,
  reason,
}: {
  token: string;
  applicationId: string;
  slot: string;
  index: number;
  reason: string;
}) {
  const [status, setStatus] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onPick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setStatus("Checking the file…");
    try {
      const prepared = await prepareFile(file, { slot, name: "", cnic: "", fatherName: "", fee: null });
      const form = new FormData();
      form.set("applicationId", applicationId);
      form.set("slot", slot);
      form.set("index", String(index));
      form.set("checks", JSON.stringify(prepared.checks));
      form.set("file", prepared.blob, prepared.name);
      const uploaded = await fetch("/api/applications/upload", { method: "POST", body: form });
      const body = (await uploaded.json()) as { document?: DocumentInput; error?: string };
      if (!uploaded.ok || !body.document) {
        setStatus(body.error || "The file was not accepted.");
        return;
      }
      const saved = await fetch("/api/applications/reupload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, document: body.document }),
      });
      const savedBody = (await saved.json()) as { error?: string };
      if (!saved.ok) {
        setStatus(savedBody.error || "The file could not be saved.");
        return;
      }
      setDone(true);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The file could not be checked.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className={styles.card}>
        <h1 className={styles.title}>File received</h1>
        <p>A reviewer will look at the new {slot.replaceAll("_", " ")}.</p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <p className={styles.kicker}>Spring Semester 2027</p>
      <h1 className={styles.title}>Upload a replacement</h1>
      <p className={styles.lead}>{reason}</p>
      <label className={styles.field} htmlFor="replacement">
        {slot.replaceAll("_", " ")}
        <input
          id="replacement"
          className={styles.control}
          type="file"
          accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf"
          disabled={busy}
          onChange={(event) => void onPick(event.target.files?.[0])}
        />
      </label>
      {status ? <p role="status">{status}</p> : null}
    </div>
  );
}
