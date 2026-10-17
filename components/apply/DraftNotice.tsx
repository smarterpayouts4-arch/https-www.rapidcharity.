"use client";

import { useSyncExternalStore } from "react";
import { FORM_STEPS } from "@/lib/application/steps";
import { clearDraft, readDraftSnapshot, savedAgo } from "@/lib/application/draft";
import styles from "./DraftNotice.module.css";

/** "Step 1 of 8, Scholarship, saved 3 minutes ago" */
export function draftMeta(step: number, savedAt: string): string {
  const index = Math.min(FORM_STEPS.length - 1, Math.max(0, step));
  const label = FORM_STEPS[index]?.label ?? "Scholarship";
  return `Step ${index + 1} of ${FORM_STEPS.length}, ${label}, saved ${savedAgo(savedAt)}`;
}

type ViewProps = {
  step: number;
  savedAt: string;
  /** compact: inside the home application card, where Apply Now is already the primary button. */
  compact?: boolean;
  resumeHref?: string;
  onResume?: () => void;
  onStartOver: () => void;
};

/** Shared "application in progress" notice: label, muted meta line, Resume + Start over. */
export function DraftNoticeView({ step, savedAt, compact = false, resumeHref, onResume, onStartOver }: ViewProps) {
  const resumeClass = `${compact ? "btn-secondary" : "btn"} btn-sm ${styles.resume}`;
  return (
    <div className={compact ? styles.compact : styles.banner} role="status" data-draft-notice>
      <div className={styles.text}>
        <p className={styles.label}>Application in progress</p>
        <p className={styles.meta}>{draftMeta(step, savedAt)}</p>
      </div>
      <div className={styles.actions}>
        {resumeHref ? (
          <a className={resumeClass} href={resumeHref}>
            Resume
          </a>
        ) : (
          <button type="button" className={resumeClass} onClick={onResume}>
            Resume
          </button>
        )}
        <button type="button" className={`btn-text btn-sm ${styles.startOver}`} onClick={onStartOver}>
          Start over
        </button>
      </div>
    </div>
  );
}

export function DraftNotice({ compact = false }: { compact?: boolean }) {
  const draft = useSyncExternalStore(
    (notify) => {
      window.addEventListener("rapid-draft", notify);
      return () => window.removeEventListener("rapid-draft", notify);
    },
    () => readDraftSnapshot(),
    () => null,
  );

  if (!draft) return null;
  const scholarship = draft.data.scholarship;
  const href = scholarship ? `/apply?scholarship=${scholarship}` : "/apply/form";

  return (
    <DraftNoticeView
      compact={compact}
      step={draft.step}
      savedAt={draft.savedAt}
      resumeHref={href}
      onStartOver={() => clearDraft()}
    />
  );
}
