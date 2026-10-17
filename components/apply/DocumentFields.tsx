"use client";

import { useEffect, useRef, useState } from "react";
import styles from "@/app/apply/form/form.module.css";
import { PDF_NOTE, mergeImagesToPdf } from "@/lib/application/prepareFile";
import { isLocalSampleDocument } from "@/lib/application/sampleDocuments";
import type { DocumentInput } from "@/lib/application/types";
import { demoHeaders } from "@/lib/application/demoMode";
import { fetchSampleFile, uploadDocument } from "./uploadClient";

/** Image types plus PDF, so phones open the photo picker. No `capture`: gallery and files only. */
export const UPLOAD_ACCEPT =
  "image/jpeg,image/png,image/heic,image/heif,image/webp,application/pdf,.jpg,.jpeg,.png,.heic,.heif,.webp,.pdf";

type Preview = { name: string; url: string; pdf: boolean };

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 15V4m0 0L7.5 8.5M12 4l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 14.5v3A2.5 2.5 0 0 0 7 20h10a2.5 2.5 0 0 0 2.5-2.5v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const LABELS: Record<string, string> = {
  cnic: "Your CNIC or B-Form, front and back",
  guardian_cnic: "Father or guardian CNIC, or a death certificate",
  admission_proof: "Admission or enrollment proof (admission letter, enrollment letter, or student ID)",
  result: "Latest result or GPA transcript",
  fee_voucher: "Current fee voucher or challan",
  pastor_letter: "Recommendation letter from your priest, pastor or religious leader",
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
  sampleSlots,
  autoSample = false,
  onSampleBusy,
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
  /** Test mode only: required slots to fill with the SAMPLE files from tests/fixtures/sample-documents. */
  sampleSlots?: string[];
  /** A sample applicant is loaded: attach the SAMPLE files automatically when this step opens. */
  autoSample?: boolean;
  onSampleBusy?: (busy: boolean) => void;
  onUpsert: (document: DocumentInput) => void;
  onRemove: (slot: string, index: number) => void;
}) {
  const [status, setStatus] = useState("");
  const [busySlots, setBusySlots] = useState<Record<string, boolean>>({});
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [slotError, setSlotError] = useState<Record<string, string>>({});
  const [previews, setPreviews] = useState<Record<string, Preview>>({});
  const [sampleBusy, setSampleBusy] = useState(false);

  function rememberPreview(key: string, preview: Preview) {
    setPreviews((current) => {
      const old = current[key];
      if (old?.url) URL.revokeObjectURL(old.url);
      return { ...current, [key]: preview };
    });
  }

  function forgetPreview(key: string) {
    setPreviews((current) => {
      const old = current[key];
      if (old?.url) URL.revokeObjectURL(old.url);
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function markBusy(slot: string, value: boolean) {
    setBusySlots((current) => ({ ...current, [slot]: value }));
  }

  async function upload(slot: string, index: number, file: File, displayName = file.name, sample = false) {
    markBusy(slot, true);
    setSlotError((current) => ({ ...current, [slot]: "" }));
    setProgress((current) => ({ ...current, [slot]: 8 }));
    setStatus("Checking the file…");
    try {
      const result = await uploadDocument({
        applicationId,
        slot,
        index,
        file,
        context,
        sampleFallback: sample,
        onProgress: (percent) => setProgress((current) => ({ ...current, [slot]: percent })),
      });
      if (!result.ok) {
        setSlotError((current) => ({ ...current, [slot]: result.error }));
        setStatus(result.error);
        setProgress((current) => ({ ...current, [slot]: 0 }));
        return;
      }
      onUpsert(result.document);
      const pdf = result.prepared.blob.type === "application/pdf";
      rememberPreview(`${slot}-${index}`, { name: displayName, url: pdf ? "" : URL.createObjectURL(result.prepared.blob), pdf });
      setProgress((current) => ({ ...current, [slot]: 100 }));
      const warnings = result.document.checks.warnings;
      setStatus(result.localSample ? "Sample file attached in this browser. File storage is not set up here, so it was not uploaded." : warnings.length ? warnings[0] ?? "" : "File accepted.");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "The file could not be checked.";
      setSlotError((current) => ({ ...current, [slot]: message }));
      setStatus(message);
      setProgress((current) => ({ ...current, [slot]: 0 }));
    } finally {
      markBusy(slot, false);
    }
  }

  async function onPick(slot: string, index: number, picked: ArrayLike<File> | null, sample = false) {
    // Copy first: the input's live FileList is cleared right after onChange.
    const list = picked ? Array.from(picked) : [];
    if (list.length === 0) return;
    if ((slot === "cnic" || slot === "guardian_cnic") && list.length === 2) {
      markBusy(slot, true);
      setStatus("Combining the front and back into one PDF…");
      try {
        const merged = await mergeImagesToPdf([list[0] as File, list[1] as File]);
        await upload(
          slot,
          index,
          new File([merged], `${slot}.pdf`, { type: "application/pdf" }),
          `${(list[0] as File).name} + ${(list[1] as File).name}`,
          sample,
        );
      } catch (reason) {
        setStatus(reason instanceof Error ? reason.message : "The two photos could not be combined.");
        markBusy(slot, false);
      }
      return;
    }
    await upload(slot, index, list[0] as File, (list[0] as File).name, sample);
  }

  async function uploadSamples() {
    if (!sampleSlots) return;
    setSampleBusy(true);
    onSampleBusy?.(true);
    try {
      const { SAMPLE_DOCUMENT_FILES } = await import("@/lib/application/sampleDocuments");
      for (const slot of sampleSlots) {
        if (documents.some((item) => item.slot === slot)) continue;
        const names = SAMPLE_DOCUMENT_FILES[slot] ?? [];
        const files: File[] = [];
        for (const name of names) files.push(await fetchSampleFile(name, demoHeaders()));
        if (files.length) await onPick(slot, 1, files, true);
      }
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "The sample files could not be loaded.");
    } finally {
      setSampleBusy(false);
      onSampleBusy?.(false);
    }
  }

  const autoStarted = useRef(false);
  const uploadSamplesRef = useRef(uploadSamples);
  useEffect(() => {
    uploadSamplesRef.current = uploadSamples;
  });
  useEffect(() => {
    if (!autoSample || !sampleSlots || autoStarted.current) return;
    if (sampleSlots.every((slot) => documents.some((item) => item.slot === slot))) return;
    autoStarted.current = true;
    const timer = window.setTimeout(() => void uploadSamplesRef.current(), 0);
    return () => window.clearTimeout(timer);
  }, [autoSample, sampleSlots, documents]);

  // The passport-size photo is asked first on the Personal step; qualification proofs sit on each education row.
  const slots = [
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
        Take a photo first, save it to your gallery, then upload it here. JPG, PNG, HEIC, or PDF, up to 5 MB each
        and 25 MB in total. Large phone photos are made smaller automatically. CNIC front and back can be two
        photos; they are combined into one PDF.
      </p>
      {sampleSlots ? (
        <div className={styles.testTools} data-testid="sample-documents">
          <p className={styles.testToolsLabel}>
            {autoSample ? "Sample applicant: the SAMPLE files are attached for you" : "Sample mode: attach the SAMPLE file for every required document"}
          </p>
          <div className={styles.testToolsActions}>
            <button type="button" className="btn-secondary btn-sm" disabled={sampleBusy} onClick={() => void uploadSamples()}>
              {sampleBusy ? "Uploading sample files…" : "Upload sample documents"}
            </button>
          </div>
        </div>
      ) : null}
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
              aria-disabled={busySlots[slot] ? "true" : undefined}
              data-error={slotError[slot] || invalidSlots?.includes(slot) ? "true" : "false"}
            >
              <span className={styles.dropIcon}>
                <UploadIcon />
              </span>
              <span className={styles.dropText}>
                <strong>
                  {busySlots[slot] ? (
                    "Checking…"
                  ) : files.length > 0 && slot !== "result" ? (
                    "Replace with another photo or file"
                  ) : (
                    <>
                      <span className={styles.dropMobile}>Choose from your photo gallery or files</span>
                      <span className={styles.dropDesktop}>Choose a file or drop it here</span>
                    </>
                  )}
                </strong>
                <span className={styles.dropHint}>
                  {slot === "cnic" || slot === "guardian_cnic"
                    ? "Pick one PDF, or two photos (front and back)."
                    : slot === "result"
                      ? "JPG, PNG, HEIC, or PDF. Up to five files."
                      : "JPG, PNG, HEIC, or PDF, up to 5 MB."}
                </span>
              </span>
            </label>
            <input
              id={`doc-${slot}`}
              className={styles.fileInput}
              type="file"
              accept={UPLOAD_ACCEPT}
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
            {files.map((file) => {
              const key = `${file.slot}-${file.index}`;
              const preview = previews[key];
              const pdf = preview ? preview.pdf : file.mime === "application/pdf";
              const showThumb = Boolean(preview?.url) || pdf;
              const localSample = isLocalSampleDocument(file);
              const notes = [
                localSample ? "Sample file (not uploaded)" : file.slot === "result" ? `Result ${file.index}, uploaded` : "Uploaded",
                `${Math.ceil(file.bytes / 1024)} KB`,
                file.checks.warnings[0] ?? "",
              ].filter(Boolean);
              return (
              <div
                key={key}
                className={styles.fileRow}
                data-has-thumb={showThumb ? "true" : "false"}
                data-error={file.checks.warnings.some((item) => item !== PDF_NOTE) ? "true" : "false"}
                data-local-sample={localSample ? "true" : undefined}
              >
                {preview?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local object URL preview of the picked file
                  <img className={styles.thumb} src={preview.url} alt="" />
                ) : pdf ? (
                  <span className={styles.thumbPdf} aria-hidden="true">PDF</span>
                ) : null}
                <span className={styles.fileMeta}>
                  {preview?.name ? <span className={styles.fileName}>{preview.name}</span> : null}
                  <span className={styles.fileNote}>{notes.join(", ")}</span>
                </span>
                <button
                  type="button"
                  className={`btn-icon ${styles.remove}`}
                  aria-label={`Remove ${label ?? slot}`}
                  onClick={() => {
                    forgetPreview(key);
                    onRemove(file.slot, file.index);
                  }}
                >
                  ×
                </button>
                <div className={styles.bar} aria-hidden="true">
                  <span style={{ width: "100%" }} />
                </div>
              </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
