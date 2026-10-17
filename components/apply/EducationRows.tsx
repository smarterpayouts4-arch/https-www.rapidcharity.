"use client";

import { useState } from "react";
import styles from "@/app/apply/form/form.module.css";
import { EDUCATION_QUALIFICATIONS, EDUCATION_STATUSES, MAX_EDUCATION_ROWS } from "@/lib/application/constants";
import { emptyEducationRow } from "@/lib/application/empty";
import { isLocalSampleDocument } from "@/lib/application/sampleDocuments";
import type { DocumentInput, EducationRow } from "@/lib/application/types";
import { UPLOAD_ACCEPT } from "./DocumentFields";
import { uploadDocument, type UploadContext } from "./uploadClient";
import { DecimalField, FieldError, NumberField, SegmentedField, SelectField, TextField } from "./widgets";

const NEXT_QUALIFICATION: Record<string, EducationRow["qualification"]> = {
  "": "matriculation",
  matriculation: "intermediate",
  intermediate: "bachelor",
  bachelor: "other",
  other: "other",
};

/**
 * Education history as stacked cards (one per qualification), matching the
 * portal's Education History table. Each row can carry an optional proof file
 * in the `education_proof` slot, linked by proof_index.
 */
export function EducationRows({
  rows,
  documents,
  applicationId,
  context,
  error,
  visible,
  onChange,
  onUpsert,
  onRemoveDocument,
}: {
  rows: EducationRow[];
  documents: DocumentInput[];
  applicationId: string;
  context: UploadContext;
  error?: string;
  visible: (...keys: string[]) => string | undefined;
  onChange: (rows: EducationRow[]) => void;
  onUpsert: (document: DocumentInput) => void;
  onRemoveDocument: (slot: string, index: number) => void;
}) {
  const [busy, setBusy] = useState<Record<number, boolean>>({});
  const [rowError, setRowError] = useState<Record<number, string>>({});

  function update(index: number, partial: Partial<EducationRow>) {
    onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...partial } : row)));
  }

  function freeProofIndex(): number | null {
    const used = new Set(rows.map((row) => row.proof_index).filter((value): value is number => value !== null));
    for (let candidate = 1; candidate <= MAX_EDUCATION_ROWS; candidate += 1) if (!used.has(candidate)) return candidate;
    return null;
  }

  async function attach(index: number, file: File) {
    const row = rows[index];
    if (!row) return;
    const proofIndex = row.proof_index ?? freeProofIndex();
    if (proofIndex === null) return;
    setBusy((current) => ({ ...current, [index]: true }));
    setRowError((current) => ({ ...current, [index]: "" }));
    try {
      const result = await uploadDocument({ applicationId, slot: "education_proof", index: proofIndex, file, context });
      if (!result.ok) {
        setRowError((current) => ({ ...current, [index]: result.error }));
        return;
      }
      onUpsert(result.document);
      update(index, { proof_index: proofIndex });
    } catch (reason) {
      setRowError((current) => ({ ...current, [index]: reason instanceof Error ? reason.message : "The file could not be added." }));
    } finally {
      setBusy((current) => ({ ...current, [index]: false }));
    }
  }

  return (
    <section className={styles.eduSection} data-field="education" aria-labelledby="education-title">
      <h3 className={styles.subTitle} id="education-title">
        Education history
      </h3>
      <p className={styles.hint}>
        Add each qualification from Matriculation onward: school or college, board or university, result and year. A proof file for each row is optional.
      </p>
      {error ? <FieldError message={error} /> : null}
      {rows.map((row, index) => {
        const proof = row.proof_index === null ? undefined : documents.find((item) => item.slot === "education_proof" && item.index === row.proof_index);
        const base = `education.${index}`;
        const title = EDUCATION_QUALIFICATIONS.find((item) => item.id === row.qualification)?.label.replace(/ \(.*\)$/, "") ?? "Qualification";
        return (
          <article key={index} className={styles.eduCard} data-field={base} data-testid="education-row">
            <header className={styles.eduHead}>
              <h4>
                {index + 1}. {row.qualification === "other" && row.qualification_other.trim() ? row.qualification_other.trim() : title}
              </h4>
              {rows.length > 1 ? (
                <button
                  type="button"
                  className="btn-text btn-sm"
                  aria-label={`Remove qualification ${index + 1}`}
                  onClick={() => {
                    if (row.proof_index !== null) onRemoveDocument("education_proof", row.proof_index);
                    onChange(rows.filter((_, rowIndex) => rowIndex !== index));
                  }}
                >
                  Remove
                </button>
              ) : null}
            </header>
            <div className={styles.two}>
              <SelectField
                label="Qualification"
                value={row.qualification}
                field={`${base}.qualification`}
                error={visible(`${base}.qualification`)}
                options={EDUCATION_QUALIFICATIONS.map((item) => ({ id: item.id, label: item.label }))}
                onChange={(value) => update(index, { qualification: value as EducationRow["qualification"] })}
              />
              {row.qualification === "other" ? (
                <TextField
                  label="Qualification name"
                  value={row.qualification_other}
                  field={`${base}.qualification_other`}
                  error={visible(`${base}.qualification_other`)}
                  onChange={(value) => update(index, { qualification_other: value })}
                />
              ) : (
                <TextField
                  label="Institution"
                  value={row.institution}
                  field={`${base}.institution`}
                  error={visible(`${base}.institution`)}
                  hint="School or college"
                  onChange={(value) => update(index, { institution: value })}
                />
              )}
            </div>
            {row.qualification === "other" ? (
              <TextField
                label="Institution"
                value={row.institution}
                field={`${base}.institution`}
                error={visible(`${base}.institution`)}
                hint="School or college"
                onChange={(value) => update(index, { institution: value })}
              />
            ) : null}
            <TextField
              label="Board or university"
              value={row.board}
              field={`${base}.board`}
              error={visible(`${base}.board`)}
              hint="For example Lahore Board or Punjab University"
              onChange={(value) => update(index, { board: value })}
            />
            <SegmentedField
              legend="Status"
              name={`education-status-${index}`}
              value={row.status}
              field={`${base}.status`}
              error={visible(`${base}.status`)}
              options={EDUCATION_STATUSES.map((item) => ({ id: item.id, label: item.label }))}
              onChange={(value) => update(index, { status: value as EducationRow["status"] })}
            />
            <div className={styles.two}>
              <DecimalField
                label={row.status === "in_progress" ? "Result (%) (optional)" : "Result (%)"}
                value={row.result_percent}
                field={`${base}.result_percent`}
                error={visible(`${base}.result_percent`)}
                placeholder="e.g. 78.5"
                onChange={(value) => update(index, { result_percent: value })}
              />
              <NumberField
                label={row.status === "in_progress" ? "Expected year" : "Year"}
                value={row.year}
                max={2100}
                field={`${base}.year`}
                error={visible(`${base}.year`)}
                onChange={(value) => update(index, { year: value })}
              />
            </div>
            <div className={styles.eduProof}>
              <label htmlFor={`edu-proof-${index}`} className="btn-secondary btn-sm" aria-disabled={busy[index] ? "true" : undefined}>
                {busy[index] ? "Adding…" : proof ? "Replace proof" : "Add proof (optional)"}
              </label>
              <input
                id={`edu-proof-${index}`}
                className={styles.fileInput}
                type="file"
                accept={UPLOAD_ACCEPT}
                disabled={Boolean(busy[index])}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void attach(index, file);
                }}
              />
              <span className={styles.photoNote}>
                {proof ? (isLocalSampleDocument(proof) ? "Sample file (not uploaded)" : `Proof uploaded, ${Math.ceil(proof.bytes / 1024)} KB`) : "Certificate, marksheet or transcript"}
              </span>
              {proof ? (
                <button
                  type="button"
                  className="btn-text btn-sm"
                  onClick={() => {
                    onRemoveDocument("education_proof", proof.index);
                    update(index, { proof_index: null });
                  }}
                >
                  Remove proof
                </button>
              ) : null}
            </div>
            <FieldError message={rowError[index] || visible(`${base}.proof_index`)} />
          </article>
        );
      })}
      {rows.length < MAX_EDUCATION_ROWS ? (
        <button
          type="button"
          className={`btn-secondary btn-sm ${styles.eduAdd}`}
          onClick={() => onChange([...rows, emptyEducationRow(NEXT_QUALIFICATION[rows.at(-1)?.qualification ?? ""] ?? "other")])}
        >
          Add another qualification
        </button>
      ) : null}
    </section>
  );
}
