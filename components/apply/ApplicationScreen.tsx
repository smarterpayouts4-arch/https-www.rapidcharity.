import { ApplicationForm } from "@/components/apply/ApplicationForm";
import type { ScholarshipId } from "@/lib/application/constants";
import { loadPromoted } from "@/lib/application/store";
import type { PromotedOption } from "@/lib/application/types";
import styles from "@/app/apply/form/form.module.css";

export async function ApplicationScreen({ initialScholarship }: { initialScholarship: ScholarshipId | "" }) {
  let promoted: PromotedOption[] = [];
  try {
    promoted = await loadPromoted();
  } catch {
    promoted = [];
  }

  return (
    <section className={styles.page}>
      <div className={styles.wrap}>
        <p className={styles.kicker}>Spring Semester 2027</p>
        <h1 className={styles.title}>Scholarship application</h1>
        <p className={styles.lead}>
          John-Ivy Azariah, Robert Mathias, and Ivy Azariah applications are collected on this form.
          Upload JPG, PNG, or PDF copies of your photo, identity card, results, fee voucher, and pastor letter. Files stay private.
        </p>
        <ApplicationForm initialScholarship={initialScholarship} promoted={promoted} />
      </div>
    </section>
  );
}
