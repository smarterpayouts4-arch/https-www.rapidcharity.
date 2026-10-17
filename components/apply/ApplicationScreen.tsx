import { ApplicationForm } from "@/components/apply/ApplicationForm";
import type { ScholarshipId } from "@/lib/application/constants";
import { loadPromoted } from "@/lib/application/store";
import { loadFormState } from "@/lib/application/formSettings";
import type { PromotedOption } from "@/lib/application/types";
import { MOCK_APPLICATIONS } from "@/lib/application/mocks";
import styles from "@/app/apply/form/form.module.css";

export async function ApplicationScreen({
  initialScholarship,
  initialMock = "",
  sampleMode = false,
}: {
  initialScholarship: ScholarshipId | "";
  initialMock?: string;
  /** Decided by the page (env gate or a matching ?demo= key). Sample data is only sent when true. */
  sampleMode?: boolean;
}) {
  const form = await loadFormState();
  if (!form.open) {
    return (
      <section className={styles.page}>
        <div className={styles.wrap}>
          <p className={styles.kicker}>{form.cycleName}</p>
          <h1 className={styles.title}>Applications are closed</h1>
          <div className={styles.card} data-testid="form-closed" role="status">
            <p className={styles.lead}>{form.closedMessage}</p>
            <p>
              <a className="text-link" href="/apply">
                See scholarships and deadlines
              </a>
            </p>
          </div>
        </div>
      </section>
    );
  }
  let promoted: PromotedOption[] = [];
  try {
    promoted = await loadPromoted();
  } catch {
    promoted = [];
  }

  return (
    <section className={styles.page}>
      <div className={styles.wrap}>
        <p className={styles.kicker}>{form.cycleName}</p>
        <h1 className={styles.title}>Scholarship application</h1>
        <p className={styles.lead}>
          John-Ivy Azariah, Robert Mathias, and Ivy Azariah applications are collected on this form.
          Upload photos (JPG, PNG, HEIC) or PDF copies of your photo, identity card, results, fee voucher, and pastor letter. Files stay private.
        </p>
        <ApplicationForm
          initialScholarship={initialScholarship}
          promoted={promoted}
          cycleName={form.cycleName}
          {...(sampleMode ? { mocks: MOCK_APPLICATIONS, initialMock } : {})}
        />
      </div>
    </section>
  );
}
