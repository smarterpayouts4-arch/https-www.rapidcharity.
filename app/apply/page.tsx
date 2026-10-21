import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DraftNotice } from "@/components/apply/DraftNotice";
import { ApplicationCard } from "@/components/home/ApplicationCard";
import { DeadlineBand } from "@/components/DeadlineBand";
import { PreviewBanner } from "@/components/PreviewBanner";
import { ShareRow } from "@/components/ShareRow";
import { isScholarshipId } from "@/lib/application/constants";
import { DEMO_PARAM, demoKeyMatches, sampleModeAllowed } from "@/lib/application/mockGate";
import { TESTING_BANNER_TEXT, testingModeFromEnv } from "@/lib/application/testingMode";
import { findMock } from "@/lib/application/mocks";
import { deadlineBandItems } from "@/lib/application/intakes";
import { loadSiteContent, resolvePreview } from "@/lib/content";
import { site } from "@/lib/site";
import styles from "./apply.module.css";

const PROGRAM_CARDS: Record<string, { chip: string; detailHref: string }> = {
  "john-ivy": { chip: "All fields except business", detailHref: "/general-8" },
  "robert-mathais": { chip: "Business students", detailHref: "/robert-mathais-scholarship" },
  "ivy-azariah": { chip: "Women only", detailHref: "/ivy-azariah-scholarship" },
};

function cardTitle(heading: string): string {
  return heading.replace(/^\d+\.\s*/, "").replace(/\s*\([^)]*\)\s*$/, "");
}

function cardSummary(body: string): string {
  const sentences = body.replace(/^Ivy Azariah Scholarship:\s*/, "").split(/(?<=\.)\s+/).filter(Boolean);
  const picked: string[] = [];
  for (const sentence of sentences) {
    if (picked.length > 0 && picked.join(" ").length + sentence.length > 220) break;
    picked.push(sentence);
    if (picked.length === 2) break;
  }
  return picked.join(" ");
}


export const metadata: Metadata = { title: "Apply" , alternates: { canonical: `${site.url}/apply` } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ApplyPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const params = searchParams ? await searchParams : undefined;
  const preview = await resolvePreview(params);
  const raw = params?.scholarship;
  const scholarshipValue = Array.isArray(raw) ? raw[0] : raw;
  const mock = sampleModeAllowed(params?.demo) ? findMock(params?.mock) : undefined;
  // Keep a valid ?demo= key on the redirect so the form unlocks sample mode too.
  const demo = demoKeyMatches(params?.demo) ? `&${DEMO_PARAM}=${encodeURIComponent(String(params?.demo))}` : "";
  if (mock) {
    redirect(`/apply/form?scholarship=${mock.scholarship}&mock=${mock.id}${demo}`);
  }
  if (isScholarshipId(scholarshipValue)) {
    redirect(`/apply/form?scholarship=${scholarshipValue}${demo}`);
  }
  const content = await loadSiteContent({ preview });
  const { apply, chrome } = content;

  return (
    <>
      {preview ? <PreviewBanner content={chrome.preview} liveHref="/apply" /> : null}
      <section className={`section ${styles.page}`}>
        <div className={`container prose ${styles.prose}`}>
          {testingModeFromEnv() || sampleModeAllowed(params?.demo) ? (
            <p className={styles.testingBanner} data-testid="testing-banner" role="status">
              {TESTING_BANNER_TEXT}
            </p>
          ) : null}
          <h1 className={styles.title}>{apply.title}</h1>
          <p className={styles.intro}>{apply.intro}</p>
          <p className={styles.criteriaLink}>
            <a className="text-link tap-link" href="/education-scholarships1">
              Review scholarship eligibility criteria
            </a>
          </p>
          <DraftNotice />

          <ApplicationCard wide content={content.applicationCard} intakes={content.intakes} />

          <div className={styles.cards}>
            {apply.programs.map((prog) => {
              const card = PROGRAM_CARDS[prog.id];
              const title = cardTitle(prog.heading);
              return (
                <article key={prog.id} id={prog.id} className={styles.card} data-reveal>
                  <h2 className={styles.cardTitle}>{title}</h2>
                  {card ? (
                    <p className={styles.chipRow}>
                      <span className={styles.chip}>{card.chip}</span>
                    </p>
                  ) : null}
                  <p className={styles.summary}>{cardSummary(prog.body)}</p>
                  <div className={styles.actions}>
                    {card ? (
                      <a className="btn-outline btn-sm" href={card.detailHref} aria-label={`Read more about ${title}`}>
                        Read more
                      </a>
                    ) : null}
                    <a className="btn btn-sm" href={prog.applyHref} aria-label={prog.applyLabel}>
                      Apply
                    </a>
                  </div>
                </article>
              );
            })}
          </div>

          <p>{apply.closing}</p>
          <p>
            <a className="tap-link" href={`mailto:${apply.contactEmail}`}>{apply.contactEmail}</a>
          </p>

          <ShareRow content={chrome.share} url={site.url} variant="labeled" />
        </div>
      </section>

      <DeadlineBand items={deadlineBandItems(content.intakes)} ariaLabel={apply.deadlinesAriaLabel} />
    </>
  );
}
