"use client";

import { useState } from "react";
import styles from "@/app/admin/admin.module.css";
import { EDUCATION_QUALIFICATIONS, LEGACY_WORKFLOW_LABELS, SCHOLARSHIPS, WORKFLOW_STATUSES } from "@/lib/application/constants";
import { isLocalSampleDocument } from "@/lib/application/sampleDocuments";
import {
  communityLabel,
  formatCnicDigits,
  guardianName,
  guardianOccupation,
  institutionLabel,
  localPhone,
  portalDateTime,
  semesterLabel,
  sessionName,
  workflowLabel,
} from "@/lib/application/portal";
import type { StoredApplication } from "@/lib/application/types";

function money(amount: number | null | undefined): string {
  return amount === null || amount === undefined ? "Not given" : `PKR ${amount.toLocaleString("en-PK")}`;
}

function initials(item: StoredApplication): string {
  return `${item.first_name.charAt(0)}${item.last_name.charAt(0)}`.toUpperCase() || "?";
}

/** Uploaded passport-size photo for this application, or "" when it was reused or never stored. */
export function photoSrc(item: StoredApplication): string {
  const photo = item.documents.find((document) => document.slot === "photo");
  if (!photo || photo.reused || isLocalSampleDocument(photo) || !photo.path) return "";
  return `/api/admin/applications/file?id=${encodeURIComponent(item.id)}&slot=photo&index=${photo.index}`;
}

/** Circular passport photo, falling back to initials. */
export function ApplicantPhoto({ item, size }: { item: StoredApplication; size: "list" | "detail" }) {
  const src = photoSrc(item);
  const [failed, setFailed] = useState(false);
  return (
    <span className={styles.applicantPhoto} data-size={size} data-empty={!src || failed ? "true" : undefined}>
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- private admin file behind the session cookie
        <img src={src} alt={size === "detail" ? `Passport-size photo of ${item.first_name} ${item.last_name}` : ""} onError={() => setFailed(true)} data-testid={`admin-photo-${size}`} />
      ) : (
        <span aria-hidden="true">{initials(item)}</span>
      )}
    </span>
  );
}

function Rows({ rows }: { rows: Array<[string, string | undefined]> }) {
  return (
    <dl className={styles.detailList}>
      {rows.map(([term, value]) => (
        <div key={term}>
          <dt>{term}</dt>
          <dd>{value && value.trim() ? value : "Not given"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ApplicationOverview({ item }: { item: StoredApplication }) {
  const scholarship = SCHOLARSHIPS.find((entry) => entry.id === item.scholarship)?.label ?? item.scholarship;
  const legacy = item.review.legacy_workflow ? LEGACY_WORKFLOW_LABELS[item.review.legacy_workflow] ?? item.review.legacy_workflow : "";
  const education = item.education ?? [];
  return (
    <>
      <header className={styles.detailHead}>
        <ApplicantPhoto item={item} size="detail" />
        <div className={styles.detailName}>
          <h3>
            {item.first_name} {item.last_name}
          </h3>
          <p>{item.application_number || "No application number (submitted before numbering)"}</p>
          <p>
            {scholarship} · {sessionName(item.cycle)} · {item.applicant_type === "continuing" ? "Continuing" : "New"}
          </p>
          <p>
            <span className={styles.pill} data-tone={item.review.workflow}>
              {workflowLabel(item.review.workflow)}
            </span>
            {legacy ? <span className={styles.legacyNote}> Earlier status: {legacy}</span> : null}
          </p>
        </div>
      </header>
      <div className={styles.detailSections}>
        <section>
          <h4>Personal</h4>
          <Rows
            rows={[
              ["Name on CNIC", item.full_name_as_on_cnic],
              ["CNIC", formatCnicDigits(item.cnic)],
              ["Date of birth", item.date_of_birth],
              ["Gender", item.gender],
              ["Community", communityLabel(item)],
              ["Country", item.country || "Pakistan"],
              ["Marital status", item.marital_status],
              ["Disability", item.disability && item.disability !== "none" ? `Yes (${item.disability_other || item.disability})` : "No"],
              ["Mobile", localPhone(item.mobile_phone)],
              ["Alternate mobile", item.secondary_phone ? localPhone(item.secondary_phone) : ""],
              ["Email", item.email],
              ["Current address", item.address_line],
              ["Permanent address", item.permanent_same === "Yes" ? "Same as current" : item.permanent_address],
              ["Employed", item.employment_status === "Yes" ? `Yes${item.employment_job ? `, ${item.employment_job}` : ""}` : "No"],
            ]}
          />
        </section>
        <section>
          <h4>Family</h4>
          <Rows
            rows={[
              ["Father / Guardian", guardianName(item)],
              ["Guardian occupation", guardianOccupation(item)],
              ["Family monthly income", money(item.family_monthly_income)],
              ["Guardian phone", localPhone(item.guardian_phone)],
            ]}
          />
        </section>
        <section>
          <h4>Academics</h4>
          <Rows
            rows={[
              ["Institution", institutionLabel(item)],
              ["Degree program", item.program_title],
              ["Current semester", semesterLabel(item.current_semester)],
              ["Current GPA", item.current_gpa === null || item.current_gpa === undefined ? "" : `${item.current_gpa.toFixed(2)} of ${item.gpa_scale || "4.00"}`],
              ["Amount requested", money(item.amount_requested)],
            ]}
          />
          {education.length ? (
            <ol className={styles.eduList}>
              {education.map((row, index) => (
                <li key={index}>
                  <strong>{row.qualification === "other" ? row.qualification_other : EDUCATION_QUALIFICATIONS.find((entry) => entry.id === row.qualification)?.label}</strong>
                  {`: ${row.institution}, ${row.board}, ${row.status === "in_progress" ? "in progress" : "completed"}`}
                  {row.result_percent !== null ? `, ${row.result_percent}%` : ""}
                  {row.year ? `, ${row.year}` : ""}
                </li>
              ))}
            </ol>
          ) : null}
        </section>
        <section>
          <h4>Support</h4>
          <Rows
            rows={[
              ["RAPID scholarship before", item.rapid_received === "Yes" ? "Yes" : "No"],
              ["Other scholarship", item.other_financial_support],
              ["Religious leader", item.pastor_name],
              ["Religious leader contact", localPhone(item.pastor_phone)],
            ]}
          />
        </section>
        {item.financial_need_statement ? (
          <section className={styles.detailWide}>
            <h4>Statement of financial need</h4>
            <p className={styles.statement}>{item.financial_need_statement}</p>
          </section>
        ) : null}
      </div>
    </>
  );
}

export function DecisionForm({
  item,
  busy,
  onSave,
}: {
  item: StoredApplication;
  busy: boolean;
  onSave: (body: Record<string, unknown>) => void;
}) {
  const [workflow, setWorkflow] = useState<string>(item.review.workflow);
  const [amount, setAmount] = useState(item.review.award_amount === null ? "" : String(item.review.award_amount));
  const [reason, setReason] = useState(item.review.rejection_reason ?? "");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const history = item.review.history ?? [];
  return (
    <form
      className={styles.decision}
      onSubmit={(event) => {
        event.preventDefault();
        if (workflow === "approved" && !/^\d+$/.test(amount.trim())) {
          setError("Enter the approved amount in PKR to approve.");
          return;
        }
        if (workflow === "rejected" && reason.trim().length < 2) {
          setError("Enter a rejection reason to reject.");
          return;
        }
        setError("");
        onSave({
          id: item.id,
          action: "decision",
          workflow,
          award_amount: workflow === "approved" ? Number(amount.trim()) : null,
          rejection_reason: workflow === "rejected" ? reason.trim() : "",
          remarks: remarks.trim(),
        });
        setRemarks("");
      }}
    >
      <h4>Decision</h4>
      <label>
        Status
        <select value={workflow} disabled={busy} onChange={(event) => setWorkflow(event.target.value)}>
          {WORKFLOW_STATUSES.map((status) => (
            <option key={status.id} value={status.id}>
              {status.label}
            </option>
          ))}
        </select>
      </label>
      {workflow === "approved" ? (
        <label>
          Approved amount (PKR), required
          <input inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ""))} />
        </label>
      ) : null}
      {workflow === "rejected" ? (
        <label>
          Rejection reason, required
          <textarea rows={3} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
        </label>
      ) : null}
      <label>
        Internal remarks (optional)
        <textarea rows={2} maxLength={1000} value={remarks} onChange={(event) => setRemarks(event.target.value)} />
      </label>
      {error ? (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-sm" disabled={busy}>
        Save decision
      </button>
      {item.review.remarks.length ? (
        <>
          <h4>Remarks</h4>
          <ul className={styles.historyList}>
            {item.review.remarks.map((remark, index) => (
              <li key={`${remark.at}-${index}`}>
                <span>{portalDateTime(remark.at)}</span> {remark.author}: {remark.text}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <h4>Status history</h4>
      <ol className={styles.historyList} data-testid="status-history">
        {history.map((entry, index) => (
          <li key={`${entry.at}-${index}`}>
            <span>{portalDateTime(entry.at)}</span> {entry.from ? `${workflowLabel(entry.from)} to ` : ""}
            {workflowLabel(entry.to)} by {entry.by}
            {entry.note ? `: ${entry.note}` : ""}
          </li>
        ))}
      </ol>
    </form>
  );
}
