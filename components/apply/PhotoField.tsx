"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "@/app/apply/form/form.module.css";
import { demoHeaders } from "@/lib/application/demoMode";
import { isLocalSampleDocument, SAMPLE_DOCUMENT_FILES } from "@/lib/application/sampleDocuments";
import type { DocumentInput } from "@/lib/application/types";
import { circleThumb, fetchSampleFile, uploadDocument, type UploadContext } from "./uploadClient";
import { FieldError } from "./widgets";

/** Photos only, so phones open the photo gallery. No `capture`: gallery first, camera stays optional. */
export const PHOTO_ACCEPT = "image/jpeg,image/png,image/heic,image/heif,image/webp,.jpg,.jpeg,.png,.heic,.heif,.webp";

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="9" r="4" fill="currentColor" />
      <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="currentColor" />
    </svg>
  );
}

/**
 * Passport-size photo, the first field of the Personal step. Uses the `photo`
 * document slot (same storage key as before). Any phone photo is converted and
 * compressed to a JPEG within 600 x 600 and 500 KB before upload.
 */
export function PhotoField({
  applicationId,
  document,
  thumb,
  error,
  context,
  continuing,
  reuse,
  onReuse,
  autoSample,
  onBusy,
  onUploaded,
  onRemove,
}: {
  applicationId: string;
  document: DocumentInput | undefined;
  thumb: string;
  error?: string;
  context: UploadContext;
  continuing: boolean;
  reuse: boolean;
  onReuse: (value: boolean) => void;
  /** A sample applicant is loaded: attach the SAMPLE photo automatically. */
  autoSample: boolean;
  onBusy?: (busy: boolean) => void;
  onUploaded: (document: DocumentInput, thumb: string) => void;
  onRemove: () => void;
}) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");

  async function handle(file: File, sample = false) {
    setBusy(true);
    onBusy?.(true);
    setFailure("");
    setMessage("Resizing your photo…");
    setProgress(8);
    try {
      const result = await uploadDocument({
        applicationId,
        slot: "photo",
        index: 1,
        file,
        context,
        sampleFallback: sample,
        onProgress: setProgress,
      });
      if (!result.ok) {
        setFailure(result.error);
        setMessage("");
        return;
      }
      const preview = await circleThumb(result.prepared.blob).catch(() => "");
      onUploaded(result.document, preview);
      setMessage(
        result.localSample
          ? "Sample photo attached in this browser. File storage is not set up here, so it was not uploaded."
          : result.document.checks.warnings[0] ?? "Photo added.",
      );
    } catch (reason) {
      setFailure(reason instanceof Error ? reason.message : "This photo could not be added.");
      setMessage("");
    } finally {
      setBusy(false);
      onBusy?.(false);
      setProgress(0);
    }
  }

  const started = useRef(false);
  const handleRef = useRef(handle);
  useEffect(() => {
    handleRef.current = handle;
  });
  useEffect(() => {
    if (!autoSample || document || reuse || started.current) return;
    started.current = true;
    const timer = window.setTimeout(() => {
      const name = SAMPLE_DOCUMENT_FILES.photo?.[0] ?? "passport-photo-sample.jpg";
      fetchSampleFile(name, demoHeaders())
        .then((file) => handleRef.current(file, true))
        .catch((reason) => setFailure(reason instanceof Error ? reason.message : "The sample photo could not be loaded."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [autoSample, document, reuse]);

  const localSample = document ? isLocalSampleDocument(document) : false;
  const shownError = failure || error;
  return (
    <div className={styles.field} data-field="documents.photo" data-invalid={shownError ? "true" : undefined}>
      <span className={styles.fieldLabel} id={`${id}-label`}>
        Passport-size Photo
      </span>
      <p className={styles.hint} id={`${id}-hint`}>
        A clear, recent passport-style photo with your face clearly visible. JPG or PNG, square works best.
      </p>
      <div className={styles.photoRow}>
        <span className={styles.photoCircle} data-empty={thumb ? undefined : "true"}>
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element -- local preview of the picked photo
            <img src={thumb} alt="Your passport-size photo" data-testid="photo-preview" />
          ) : (
            <PersonIcon />
          )}
        </span>
        <div className={styles.photoActions}>
          <label
            htmlFor="doc-photo"
            className="btn-secondary btn-sm"
            data-focus
            tabIndex={-1}
            aria-disabled={busy || reuse ? "true" : undefined}
          >
            {busy ? "Adding photo…" : document ? "Replace photo" : "Choose photo"}
          </label>
          {document && !busy ? (
            <button
              type="button"
              className="btn-text btn-sm"
              onClick={() => {
                setMessage("");
                onRemove();
              }}
            >
              Remove photo
            </button>
          ) : null}
          <p className={styles.photoNote}>
            {busy
              ? `Uploading ${progress}%`
              : document
                ? localSample
                  ? "Sample file (not uploaded)"
                  : `Uploaded, ${Math.ceil(document.bytes / 1024)} KB`
                : reuse
                  ? "Using the photo from your previous application"
                  : "From your photo gallery or files"}
          </p>
        </div>
      </div>
      <input
        id="doc-photo"
        className={styles.fileInput}
        type="file"
        accept={PHOTO_ACCEPT}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-hint`}
        disabled={busy || reuse}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void handle(file);
        }}
      />
      {message && !shownError ? (
        <p className={styles.hint} role="status">
          {message}
        </p>
      ) : null}
      {continuing ? (
        <label className={styles.choice}>
          <input type="checkbox" checked={reuse} onChange={(event) => onReuse(event.target.checked)} />
          <span>Passport photo is unchanged</span>
        </label>
      ) : null}
      <FieldError message={shownError} />
    </div>
  );
}
