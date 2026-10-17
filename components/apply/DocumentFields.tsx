"use client";

import { useState } from "react";
import styles from "@/app/apply/form/form.module.css";
import { prepareFile, mergeImagesToPdf } from "@/lib/application/prepareFile";
import type { DocumentInput } from "@/lib/application/types";

const LABELS: Record<string, string> = {
  photo: "Passport photo",
  cnic: "Your CNIC or B-Form, front and back",
  guardian_cnic: "Father or guardian CNIC, or a death certificate",
  admission_proof: "Admission proof, enrolment letter, or student ID",
  result: "Latest result card",
  fee_voucher: "Current fee voucher or challan",
  pastor_letter: "Pastor or priest recommendation letter",
  income_proof: "Income proof (recommended when income is above zero)",
  disability_certificate: "Disability certificate",
  other_award: "Other scholarship award letter",
};

export function DocumentFields({
  applicationId,
  documents,
  error,
  field,
  invalidSlots,
  hints,
  context,
  onUpsert,
  onRemove,
}: {
  applicationId: string;
  documents: DocumentInput[];
  error?: string;
  field?: string;
  invalidSlots?: string[];
  hints: { slot: string; text: string }[];
  context: { name: string; cnic: string; fatherName: string; fee: number | null; fatherLate: boolean; under18: boolean };
  onUpsert: (document: DocumentInput) => void;
  onRemove: (slot: string, index: number) => void;
}) {
  const [status, setStatus] = useState("");
  const [busySlots, setBusySlots] = useState<Record<string, boolean>>({});
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [slotError, setSlotError] = useState<Record<string, string>>({});

  function markBusy(slot: string, value: boolean) {
    setBusySlots((current) => ({ ...current, [slot]: value }));
  }

  function postFile(form: FormData, slot: string): Promise<{ ok: boolean; document?: DocumentInput; error?: string }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/applications/upload");
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        setProgress((current) => ({ ...current, [slot]: Math.round((event.loaded / event.total) * 100) }));
      };
      xhr.onload = () => {
        try {
          const body = JSON.parse(xhr.responseText) as { document?: DocumentInput; error?: string };
          resolve({ ok: xhr.status >= 200 && xhr.status < 300, ...body });
        } catch {
          reject(new Error("The file was not accepted."));
        }
      };
      xhr.onerror = () => reject(new Error("The file could not be uploaded."));
      xhr.send(form);
    });
  }

  async function upload(slot: string, index: number, file: File) {
    markBusy(slot, true);
    setSlotError((current) => ({ ...current, [slot]: "" }));
    setProgress((current) => ({ ...current, [slot]: 8 }));
    setStatus("Checking the file…");
    try {
      const prepared = await prepareFile(file, { slot, ...context });
      const form = new FormData();
      form.set("applicationId", applicationId);
      form.set("slot", slot);
      form.set("index", String(index));
      form.set("checks", JSON.stringify(prepared.checks));
      form.set("file", prepared.blob, prepared.name);
      setProgress((current) => ({ ...current, [slot]: 20 }));
      const body = await postFile(form, slot);
      if (!body.ok || !body.document) {
        const message = body.error || "The file was not accepted.";
        setSlotError((current) => ({ ...current, [slot]: message }));
        setStatus(message);
        setProgress((current) => ({ ...current, [slot]: 0 }));
        return;
      }
      onUpsert(body.document);
      setProgress((current) => ({ ...current, [slot]: 100 }));
      const warnings = body.document.checks.warnings;
      setStatus(warnings.length ? warnings[0] ?? "" : "File accepted.");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "The file could not be checked.";
      setSlotError((current) => ({ ...current, [slot]: message }));
      setStatus(message);
      setProgress((current) => ({ ...current, [slot]: 0 }));
    } finally {
      markBusy(slot, false);
    }
  }

  async function onPick(slot: string, index: number, list: FileList | null) {
    if (!list || list.length === 0) return;
    if ((slot === "cnic" || slot === "guardian_cnic") && list.length === 2) {
      markBusy(slot, true);
      setStatus("Combining the front and back into one PDF…");
      try {
        const merged = await mergeImagesToPdf([list[0] as File, list[1] as File]);
        await upload(slot, index, new File([merged], `${slot}.pdf`, { type: "application/pdf" }));
      } catch (reason) {
        setStatus(reason instanceof Error ? reason.message : "The two photos could not be combined.");
        markBusy(slot, false);
      }
      return;
    }
    await upload(slot, index, list[0] as File);
  }

  const slots = [
    "photo",
    "cnic",
    "guardian_cnic",
    "admission_proof",
    "result",
    "fee_voucher",
    "pastor_letter",
    "income_proof",
    "disability_certificate",
    "other_award",
  ];

  return (
    <div className={styles.grid} data-field={field}>
      <p className={styles.noteBox}>
        JPG, PNG, or PDF. Each file can be up to 5 MB and the set up to 25 MB. Photos are compressed in the browser
        before they are stored. CNIC front and back can be two photos; they are combined into one PDF.
      </p>
      {error ? <p className={styles.error}>{error}</p> : null}
      {status ? <p role="status">{status}</p> : null}
      {slots.map((slot) => {
        const hint = hints.find((item) => item.slot === slot)?.text;
        const files = documents.filter((item) => item.slot === slot);
        const label =
          slot === "cnic" && context.under18
            ? "B-Form, front and back"
            : slot === "guardian_cnic" && context.fatherLate
              ? "Death certificate, or the guardian CNIC"
              : LABELS[slot];
        return (
          <div
            key={slot}
            className={styles.field}
            data-field={`documents.${slot}`}
            data-invalid={invalidSlots?.includes(slot) ? "true" : undefined}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const index = slot === "result" ? Math.min(5, files.length + 1) : 1;
              void onPick(slot, index, event.dataTransfer.files);
            }}
          >
            <label htmlFor={`doc-${slot}`}>{label}</label>
            {hint ? <p className={styles.hint}>{hint}</p> : null}
            <label
              className={styles.drop}
              htmlFor={`doc-${slot}`}
              data-focus
              tabIndex={-1}
              data-error={slotError[slot] || invalidSlots?.includes(slot) ? "true" : "false"}
            >
              <strong>{busySlots[slot] ? "Checking…" : "Select or drop a file"}</strong>
              <span className={styles.hint}>JPG, PNG, or PDF · 5 MB each · 25 MB total</span>
            </label>
            <input
              id={`doc-${slot}`}
              className={styles.hp}
              type="file"
              accept="image/jpeg,image/png,image/heic,application/pdf,.jpg,.jpeg,.png,.heic,.pdf"
              multiple={slot === "cnic" || slot === "guardian_cnic" || slot === "result"}
              disabled={Boolean(busySlots[slot])}
              onChange={(event) => {
                const list = event.target.files;
                const index = slot === "result" ? Math.min(5, files.length + 1) : 1;
                void onPick(slot, index, list);
                event.target.value = "";
              }}
            />
            {busySlots[slot] ? (
              <div className={styles.fileRow}>
                <span>Uploading</span>
                <span>{progress[slot] ?? 0}%</span>
                <div className={styles.bar} aria-hidden="true">
                  <span style={{ width: `${progress[slot] ?? 0}%` }} />
                </div>
              </div>
            ) : null}
            {slotError[slot] ? <p className={styles.error}>{slotError[slot]}</p> : null}
            {files.map((file) => (
              <div key={`${file.slot}-${file.index}`} className={styles.fileRow} data-error={file.checks.warnings[0] ? "true" : "false"}>
                <span>
                  {file.slot === "result" ? `Result ${file.index}` : "Uploaded"} · {Math.ceil(file.bytes / 1024)} KB
                  {file.checks.duplicate_across ? " · also seen on another application" : ""}
                  {file.checks.warnings[0] ? ` · ${file.checks.warnings[0]}` : ""}
                </span>
                <button
                  type="button"
                  className={styles.remove}
                  aria-label={`Remove ${label ?? slot}`}
                  onClick={() => onRemove(file.slot, file.index)}
                >
                  ×
                </button>
                <div className={styles.bar} aria-hidden="true">
                  <span style={{ width: "100%" }} />
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
