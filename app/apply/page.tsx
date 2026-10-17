import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ContentLink } from "@/components/ContentLink";
import { deadlineFact } from "@/components/apply/LandingBody";
import { ReadableParagraph } from "@/components/content/Guide";
import { ScholarshipStory } from "@/components/apply/ScholarshipStory";
import { DraftNotice } from "@/components/apply/DraftNotice";
import { DeadlineBand } from "@/components/DeadlineBand";
import { PreviewBanner } from "@/components/PreviewBanner";
import { ShareRow } from "@/components/ShareRow";
import { isScholarshipId } from "@/lib/application/constants";
import { deadlineBandItems, deadlineCycleItems, type ScholarshipId } from "@/lib/application/intakes";
import { loadSiteContent, resolvePreview } from "@/lib/content";
import { site } from "@/lib/site";
import styles from "./apply.module.css";

const PROGRAM_FACTS: Record<string, { who: string; eligibility: string; covers: string }> = {
  "john-ivy": {
    who: "This scholarship aims to support students in various fields of study, encouraging academic excellence and providing financial assistance to those in need.",
    eligibility: "The John-Ivy Azariah Scholarship is open to all students except those pursuing a business degree.",
    covers: "Providing financial assistance to those in need.",
  },
  "robert-mathais": {
    who: "The Robert Mathais Scholarship is specifically for students enrolled in business programs.",
    eligibility: "This scholarship is intended to support future business leaders, providing them with the resources they need to succeed in their academic and professional endeavors.",
    covers: "Providing them with the resources they need to succeed in their academic and professional endeavors.",
  },
  "ivy-azariah": {
    who: "Ivy Azariah Scholarship (for Women only).",
    eligibility: "For our wonderful grandmother we would like to give this award to an individual that is not looking for just making themselves better but how they could be an important part in the development of others as true success can be measured by the skills that can be passed from generation to generation.",
    covers: "Ivy Azariah believed these qualities were the true measure of success: 1) respect for God, your family and yourself, 2) education and 3) discipline.",
  },
};

const PROGRAM_SCHOLARSHIP: Record<string, ScholarshipId> = {
  "john-ivy": "john-ivy-azariah",
  "robert-mathais": "robert-mathias",
  "ivy-azariah": "ivy-azariah",
};

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
  if (isScholarshipId(scholarshipValue)) {
    redirect(`/apply/form?scholarship=${scholarshipValue}`);
  }
  const content = await loadSiteContent({ preview });
  const { apply, chrome } = content;

  return (
    <>
      {preview ? <PreviewBanner content={chrome.preview} liveHref="/apply" /> : null}
      <section className={`section ${styles.page}`}>
        <div className={`container prose ${styles.prose}`}>
          <h1 className={styles.title}>{apply.title}</h1>
          <p className={styles.intro}>{apply.intro}</p>
          <p className={styles.criteriaLink}>
            <a className="text-link" href="/education-scholarships1">
              Review scholarship eligibility criteria
            </a>
          </p>
          <DraftNotice />

          {apply.programs.map((prog) => {
            const facts = PROGRAM_FACTS[prog.id];
            const intro = prog.body.split(/(?<=\.)\s/)[0] ?? prog.body;
            return (
              <div key={prog.id} data-reveal>
                <h2>{prog.heading}</h2>
                <ScholarshipStory
                  intro={intro}
                  facts={[
                    { label: "Who it's for", text: facts?.who ?? intro },
                    { label: "Eligibility", text: facts?.eligibility ?? prog.heading },
                    { label: "What it covers", text: facts?.covers ?? intro },
                    deadlineFact(deadlineCycleItems(content.intakes, PROGRAM_SCHOLARSHIP[prog.id])),
                  ]}
                >
                  <ReadableParagraph text={prog.body} />
                </ScholarshipStory>
                <p>
                  <ContentLink className="text-link" href={prog.applyHref}>
                    {prog.applyLabel}
                  </ContentLink>
                </p>
              </div>
            );
          })}

          <p>{apply.closing}</p>
          <p>
            <a href={`mailto:${apply.contactEmail}`}>{apply.contactEmail}</a>
          </p>

          <ShareRow content={chrome.share} url={site.url} variant="labeled" />
        </div>
      </section>

      <DeadlineBand items={deadlineBandItems(content.intakes)} ariaLabel={apply.deadlinesAriaLabel} />
    </>
  );
}
