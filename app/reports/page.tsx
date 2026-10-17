import { existsSync } from "fs";
import { join } from "path";
import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { PreviewBanner } from "@/components/PreviewBanner";
import { loadSiteContent, resolvePreview } from "@/lib/content";
import { resolveReportLinks } from "@/lib/content/media";
import { site } from "@/lib/site";
import styles from "./reports.module.css";

export const metadata: Metadata = {
  title: "Annual Reports",
  description:
    "RAPID Charity annual reports: view and download Report 2025 (PowerPoint).",
  alternates: { canonical: `${site.url}/reports` },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const params = searchParams ? await searchParams : undefined;
  const preview = await resolvePreview(params);
  const { reports, chrome } = await loadSiteContent({ preview });
  const localFileExists =
    reports.pptxPath.startsWith("/") &&
    existsSync(join(process.cwd(), "public", reports.pptxPath.replace(/^\//, "")));
  const links = resolveReportLinks({
    pptxPath: reports.pptxPath,
    publicSrc: reports.publicSrc,
    officeEmbedSrc: reports.officeEmbedSrc,
    localFileExists,
  });

  return (
    <>
      {preview ? <PreviewBanner content={chrome.preview} liveHref="/reports" /> : null}
      <PageHero title={reports.heroTitle} subtitle={reports.heroSubtitle} />
      <section className={styles.section} aria-labelledby="report-2025-heading">
        <div className="container">
          <article className={styles.card}>
            <header className={styles.cardHeader}>
              <div>
                <p className="eyebrow">{reports.featuredEyebrow}</p>
                <h2 id="report-2025-heading" className={styles.cardTitle}>
                  {reports.reportTitle}
                </h2>
                <p className={styles.cardLead}>{reports.reportDescription}</p>
              </div>
              {links.available ? (
                <a
                  className="btn-secondary"
                  href={links.downloadHref}
                  {...(links.localDownload ? { download: true } : { target: "_blank", rel: "noopener noreferrer" })}
                >
                  {reports.downloadLabel}
                </a>
              ) : null}
            </header>

            {links.embedSrc ? (
              <div className={styles.embedWrap}>
                <iframe
                  className={styles.embed}
                  src={links.embedSrc}
                  title={reports.iframeTitle}
                  allowFullScreen
                />
              </div>
            ) : (
              <div className={styles.missing} role="status">
                {links.available ? (
                  <p>Slide deck opens from the download link. An in-page viewer appears when a local file or REPORT_2025_URL is set.</p>
                ) : (
                  <>
                    <p>Report 2025 is not attached to this deployment yet.</p>
                    <p>
                      Add the deck at <code>public/assets/documents/report-2025.pptx</code> or set{" "}
                      <code>REPORT_2025_URL</code> to a public PowerPoint link.
                    </p>
                  </>
                )}
              </div>
            )}

            <p className={styles.note}>
              {reports.noteBefore}{" "}
              {links.available ? (
                <a
                  href={links.downloadHref}
                  {...(links.localDownload ? { download: true } : { target: "_blank", rel: "noopener noreferrer" })}
                >
                  {reports.noteLinkLabel}
                </a>
              ) : (
                <span>{reports.noteLinkLabel}</span>
              )}{" "}
              {reports.noteAfter}
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
