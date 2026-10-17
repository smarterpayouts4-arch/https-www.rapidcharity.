"use client";

import { useState } from "react";
import styles from "@/app/admin/admin.module.css";
import type { BatchRecord } from "@/lib/application/batches";
import { APPLICATION_CYCLE, EXPORT_CATEGORY_OPTIONS, SCHOLARSHIPS, WORKFLOW_STATUSES } from "@/lib/application/constants";
import { FIELD_TO_PROMOTED_LIST } from "@/lib/application/record";
import type { StoredApplication } from "@/lib/application/types";

const labels = Object.fromEntries(SCHOLARSHIPS.map((item) => [item.id, item.label]));

export function ApplicationsPanel({
  initial,
  initialBatches,
  storage,
  initialError,
  activeCycle,
}: {
  initial: StoredApplication[];
  initialBatches: BatchRecord[];
  storage: "firestore" | "local";
  initialError: string;
  activeCycle?: string;
}) {
  const [items, setItems] = useState(initial);
  const [batches, setBatches] = useState(initialBatches);
  const [cycle, setCycle] = useState(
    (activeCycle && initialBatches.some((item) => item.cycle === activeCycle) ? activeCycle : undefined) ??
      initialBatches[0]?.cycle ??
      activeCycle ??
      APPLICATION_CYCLE,
  );
  const [status, setStatus] = useState(initialError);
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState("");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState("");
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [finalReady, setFinalReady] = useState(false);

  async function load() {
    setStatus("Loading applications…");
    try {
      const response = await fetch("/api/admin/applications", { cache: "no-store" });
      const body = (await response.json()) as {
        submissions?: StoredApplication[];
        batches?: BatchRecord[];
        storage?: string;
        error?: string;
      };
      if (!response.ok) {
        setStatus(body.error || "Applications could not be loaded.");
        setItems([]);
        return;
      }
      setItems(body.submissions ?? []);
      if (body.batches) setBatches(body.batches);
      setStatus("");
    } catch {
      setStatus("Applications could not be loaded.");
    }
  }

  async function review(id: string, field: string, action: "promote" | "dismiss") {
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/admin/applications/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, field, action }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setStatus(body.error || "The review could not be saved.");
        return;
      }
      await load();
    } catch {
      setStatus("The review could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function act(body: Record<string, unknown>) {
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/admin/applications/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { error?: string; reuploadPath?: string };
      if (!response.ok) {
        setStatus(payload.error || "The review could not be saved.");
        return;
      }
      if (payload.reuploadPath) {
        const href = `${window.location.origin}${payload.reuploadPath}`;
        setLink(href);
        setStatus("Re-upload link ready. Copy it for the student. Email is not sent automatically.");
      }
      await load();
    } catch {
      setStatus("The review could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  const batch = batches.find((item) => item.cycle === cycle) ?? batches[0];
  const inBatch = items.filter((item) => item.cycle === (batch?.cycle ?? cycle));
  const visible = inBatch.filter((item) => {
    if (filter === "all") return true;
    if (filter === "review") return item.review.status === "needs_review";
    return item.review.workflow === filter;
  });
  const needsReview = inBatch.filter((item) => item.review.status === "needs_review" || item.review.workflow === "submitted").length;
  const storeName = storage === "firestore" ? "Firestore" : "the local submission files";

  async function closeSelected() {
    if (!batch) return;
    if (!window.confirm(`Close ${batch.label}? Students will not be able to submit for this batch.`)) return;
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/admin/applications/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close", cycle: batch.cycle }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setStatus(body.error || "The batch could not be closed.");
        return;
      }
      setFinalReady(false);
      await load();
      setStatus(`${batch.label} is closed. Download the final Excel, then archive it.`);
    } catch {
      setStatus("The batch could not be closed.");
    } finally {
      setBusy(false);
    }
  }

  async function downloadFinal() {
    if (!batch) return;
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch(`/api/admin/applications/excel?cycle=${batch.cycle}&final=1`);
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setFinalReady(false);
        setStatus(body.error || "The final Excel could not be downloaded.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `rapid-scholarship-${batch.cycle}.xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);
      setFinalReady(true);
      await load();
      setStatus(`Final Excel for ${batch.label} downloaded. Type the batch id to delete it.`);
    } catch {
      setFinalReady(false);
      setStatus("The final Excel could not be downloaded.");
    } finally {
      setBusy(false);
    }
  }

  async function purgeSelected() {
    if (!batch || confirmText !== batch.cycle) return;
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/admin/applications/purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycle: batch.cycle, confirm: confirmText }),
      });
      const body = (await response.json()) as { error?: string; submissions?: number; files?: number };
      if (!response.ok) {
        setStatus(body.error || "The batch could not be archived.");
        return;
      }
      setPurgeOpen(false);
      setConfirmText("");
      setFinalReady(false);
      await load();
      setStatus(
        `${batch.label} archived. ${body.submissions ?? 0} submissions and ${body.files ?? 0} files were deleted from ${storeName} and file storage.`,
      );
    } catch {
      setStatus("The batch could not be archived.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.appPanel}>
      <div className={styles.appToolbar}>
        <div>
          <h2>Scholarship applications</h2>
          <p>
            {storage === "firestore"
              ? "Stored in Firestore under named fields."
              : "Stored in local files until Firestore is configured."}{" "}
            Other answers stay as typed until you add them to a list or mark them reviewed.
          </p>
        </div>
        <div className={styles.appMeta}>
          <button type="button" className={styles.btnGhost} onClick={() => void load()}>
            Refresh
          </button>
          <a className={styles.btnGhost} href={`/api/admin/applications/export?cycle=${batch?.cycle ?? cycle}`}>
            Download CSV
          </a>
          <a className={styles.btnGhost} href={`/api/admin/applications/excel?cycle=${batch?.cycle ?? cycle}`}>
            Download Excel
          </a>
        </div>
      </div>
      {batch ? (
        <div className={styles.batchBar}>
          <label className={styles.appFilter}>
            Batch
            <select
              value={batch.cycle}
              onChange={(event) => {
                setCycle(event.target.value);
                setPurgeOpen(false);
                setConfirmText("");
                setFinalReady(false);
              }}
            >
              {batches.map((item) => (
                <option key={item.cycle} value={item.cycle}>
                  {item.label} · {item.status}
                </option>
              ))}
            </select>
          </label>
          <p>
            {inBatch.length} application{inBatch.length === 1 ? "" : "s"} in {batch.label}.{" "}
            {batch.status === "open"
              ? "Close the batch when review is finished, export the workbook, then archive it to free Firestore and Drive space."
              : batch.status === "closed"
                ? batch.exported_at
                  ? `Closed ${batch.closed_at?.slice(0, 10)}. Final Excel downloaded ${batch.exported_at.slice(0, 16).replace("T", " ")}.`
                  : `Closed ${batch.closed_at?.slice(0, 10)}. Download the final Excel before archiving.`
                : `Archived ${batch.purged_at?.slice(0, 10)}. ${batch.purged_submissions} submissions and ${batch.purged_files} files were deleted.`}
          </p>
          <div className={styles.appMeta}>
            {batch.status === "open" ? (
              <button type="button" className={styles.btnGhost} disabled={busy} onClick={() => void closeSelected()}>
                Close batch
              </button>
            ) : null}
            {batch.status === "closed" ? (
              <button
                type="button"
                className={styles.btnDanger}
                disabled={busy}
                onClick={() => {
                  setPurgeOpen(true);
                  setFinalReady(false);
                  setConfirmText("");
                }}
              >
                Archive & purge batch
              </button>
            ) : null}
          </div>
          {purgeOpen && batch.status === "closed" ? (
            <div className={styles.purgeDialog} role="dialog" aria-labelledby="purge-title">
              <h3 id="purge-title">Archive & purge {batch.label}</h3>
              <p>
                This deletes every {batch.label} application from {storeName} and its uploaded files from Google Drive,
                Cloudinary, or the local upload folder. Only the archive date and the counts are kept. Download the
                workbook first. This cannot be undone.
              </p>
              <button type="button" className={styles.btn} disabled={busy} onClick={() => void downloadFinal()}>
                Download final Excel
              </button>
              <label>
                Type {batch.cycle} to confirm
                <input
                  value={confirmText}
                  onChange={(event) => setConfirmText(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
              <div className={styles.appMeta}>
                <button
                  type="button"
                  className={styles.btnDanger}
                  disabled={busy || !finalReady || confirmText !== batch.cycle}
                  onClick={() => void purgeSelected()}
                >
                  Delete this batch
                </button>
                <button
                  type="button"
                  className={styles.btnGhost}
                  disabled={busy}
                  onClick={() => {
                    setPurgeOpen(false);
                    setConfirmText("");
                    setFinalReady(false);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className={styles.chips} role="group" aria-label="Filter applications">
        {[
          ["all", "All"],
          ["review", "Needs review"],
          ["submitted", "Submitted"],
          ["under_review", "Under review"],
          ["approved", "Approved"],
          ["rejected", "Rejected"],
        ].map(([id, label]) => (
          <button key={id} type="button" className={styles.chip} data-on={filter === id} onClick={() => setFilter(id)}>
            {label}
          </button>
        ))}
      </div>
      {needsReview > 0 ? (
        <p className={styles.reviewBanner}>
          {needsReview} application{needsReview === 1 ? "" : "s"} to review in {batch?.label ?? "this batch"}.
        </p>
      ) : null}
      {status ? <p role="status">{status}</p> : null}
      {visible.length === 0 && !status ? <p>No applications in this view.</p> : null}
      <ul className={styles.appList}>
        {visible.map((item) => (
          <li key={item.id} className={styles.appCard}>
            <div className={styles.appSummary}>
              <div>
                <strong>
                  {item.first_name} {item.last_name}
                </strong>
                <p>
                  {labels[item.scholarship] ?? item.scholarship} · {item.email}
                </p>
                <p>CNIC {item.cnic} · {item.submitted_at.slice(0, 10)}</p>
              </div>
              <div className={styles.appMeta}>
                <span className={styles.pill} data-tone={item.review.workflow}>
                  {WORKFLOW_STATUSES.find((status) => status.id === item.review.workflow)?.label ?? "Submitted"}
                </span>
                <span className={styles.pill} data-review={item.review.status}>
                  {item.review.status === "needs_review"
                    ? "Needs review"
                    : item.review.status === "reviewed"
                      ? "Reviewed"
                      : "No other values"}
                </span>
                <button type="button" className={styles.btnGhost} onClick={() => setOpenId(openId === item.id ? "" : item.id)}>
                  {openId === item.id ? "Hide" : "View"}
                </button>
              </div>
            </div>
            {openId === item.id ? (
              <div className={styles.appDetail}>
                <p>
                  {item.field_of_study.option_id}
                  {item.field_of_study.other_text ? ` (${item.field_of_study.other_text})` : ""} · {item.gender} ·{" "}
                  {item.applicant_type}
                </p>
                <p>
                  Phone {item.mobile_phone}
                  {item.mobile_phone_raw ? ` (entered ${item.mobile_phone_raw})` : ""}
                </p>
                {item.review.other_fields.length === 0 ? <p>No free-text Other answers.</p> : null}
                <ul>
                  {item.review.other_fields.map((field) => (
                    <li key={field.field}>
                      <strong>{field.field}</strong>: {field.other_text}
                      {field.reviewed ? " · reviewed" : null}
                      {field.reviewed ? null : (
                        <span className={styles.appActions}>
                          {FIELD_TO_PROMOTED_LIST[field.field as keyof typeof FIELD_TO_PROMOTED_LIST] ? (
                            <button type="button" disabled={busy} onClick={() => void review(item.id, field.field, "promote")}>
                              Add to list
                            </button>
                          ) : null}
                          <button type="button" disabled={busy} onClick={() => void review(item.id, field.field, "dismiss")}>
                            Mark reviewed
                          </button>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <label className={styles.appFilter}>
                  Review status
                  <select
                    value={item.review.workflow}
                    disabled={busy}
                    onChange={(event) => void act({ id: item.id, action: "workflow", workflow: event.target.value })}
                  >
                    {WORKFLOW_STATUSES.map((status) => (
                      <option key={status.id} value={status.id}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.appFilter}>
                  Category sheet
                  <select
                    value={item.review.export_category}
                    disabled={busy}
                    onChange={(event) => void act({ id: item.id, action: "category", export_category: event.target.value })}
                  >
                    {EXPORT_CATEGORY_OPTIONS.map((option) => (
                      <option key={option.id || "auto"} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    const amount = String(form.get("award") ?? "").trim();
                    void act({ id: item.id, action: "award", award_amount: amount ? Number(amount) : null });
                  }}
                >
                  <label>
                    Award PKR (blank uses 50% of the fee)
                    <input name="award" inputMode="numeric" defaultValue={item.review.award_amount ?? ""} />
                  </label>
                  <button type="submit" disabled={busy}>
                    Save award
                  </button>
                </form>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    void act({ id: item.id, action: "remark", text: String(form.get("remark") ?? "") });
                    event.currentTarget.reset();
                  }}
                >
                  <label>
                    Remark
                    <input name="remark" maxLength={1000} />
                  </label>
                  <button type="submit" disabled={busy}>
                    Add remark
                  </button>
                </form>
                <ul>
                  {item.documents.map((document) => (
                    <li key={`${document.slot}-${document.index}`}>
                      <a href={`/api/admin/applications/file?id=${item.id}&slot=${document.slot}&index=${document.index}`}>
                        {document.slot}
                        {document.slot === "result" ? ` ${document.index}` : ""}
                      </a>{" "}
                      · {document.review_state}
                      {document.reused ? " · reused" : ""}
                      {document.checks.warnings[0] ? ` · ${document.checks.warnings[0]}` : ""}
                      <span className={styles.appActions}>
                        <button type="button" disabled={busy} onClick={() => void act({ id: item.id, action: "document", slot: document.slot, index: document.index, doc_state: "verified" })}>
                          Verified
                        </button>
                        <button type="button" disabled={busy} onClick={() => void act({ id: item.id, action: "document", slot: document.slot, index: document.index, doc_state: "rejected", reason: "Please upload a clearer copy." })}>
                          Rejected
                        </button>
                        <button type="button" disabled={busy} onClick={() => void act({ id: item.id, action: "document", slot: document.slot, index: document.index, doc_state: "reupload", reason: "Please upload this document again." })}>
                          Re-upload
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
                {link ? (
                  <p>
                    Re-upload link: <a href={link}>{link}</a>
                  </p>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
