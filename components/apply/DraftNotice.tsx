"use client";

import { useEffect, useState } from "react";
import { FORM_STEPS } from "@/lib/application/schema";
import { clearDraft, readDraft, savedAgo, type ApplicationDraft } from "@/lib/application/draft";
import styles from "@/app/apply/form/form.module.css";

export function DraftNotice({ compact = false }: { compact?: boolean }) {
  const [draft, setDraft] = useState<ApplicationDraft | null>(null);

  useEffect(() => {
    setDraft(readDraft());
  }, []);

  if (!draft) return null;
  const step = Math.min(FORM_STEPS.length, Math.max(1, draft.step + 1));
  const label = FORM_STEPS[draft.step]?.label ?? "Scholarship";
  const scholarship = draft.data.scholarship;
  const href = scholarship ? `/apply?scholarship=${scholarship}` : "/apply/form";

  return (
    <div className={compact ? styles.draftCompact : styles.draftBanner} role="status">
      <p>
        You have an application in progress (Step {step} of {FORM_STEPS.length} · {label}, saved {savedAgo(draft.savedAt)}).
      </p>
      <div className={styles.draftActions}>
        <a className={styles.btn} href={href}>
          Resume
        </a>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={() => {
            clearDraft();
            setDraft(null);
          }}
        >
          Start over
        </button>
      </div>
    </div>
  );
}
