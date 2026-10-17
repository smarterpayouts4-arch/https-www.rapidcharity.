import type { Metadata } from "next";
import { ReuploadForm } from "@/components/apply/ReuploadForm";
import { findReupload } from "@/lib/application/store";
import styles from "../form/form.module.css";

export const metadata: Metadata = { title: "Replace a document" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ReuploadPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = searchParams ? await searchParams : undefined;
  const raw = params?.token;
  const token = Array.isArray(raw) ? raw[0] : raw;
  const found = token ? await findReupload(token).catch(() => null) : null;
  return (
    <section className={styles.page}>
      <div className={styles.wrap}>
        {found && token ? (
          <ReuploadForm
            token={token}
            applicationId={found.application.id}
            slot={found.slot}
            index={found.index}
            reason={found.reason || "Please upload a clearer copy of this document."}
          />
        ) : (
          <div className={styles.card}>
            <h1 className={styles.title}>This link is not active</h1>
            <p className={styles.lead}>Ask the reviewer for a new re-upload link if the previous one has already been used.</p>
          </div>
        )}
      </div>
    </section>
  );
}
