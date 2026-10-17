import type { Metadata } from "next";
import Link from "next/link";
import { GuideSections, ReadableParagraph } from "@/components/content/Guide";
import { PageHero } from "@/components/PageHero";
import { PreviewBanner } from "@/components/PreviewBanner";
import { loadSiteContent, resolvePreview } from "@/lib/content";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Scholarship Criteria" , alternates: { canonical: `${site.url}/education-scholarships1` } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ScholarshipCriteriaPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const params = searchParams ? await searchParams : undefined;
  const preview = await resolvePreview(params);
  const content = await loadSiteContent({ preview });
  const landing = content.apply.landings.criteria;

  return (
    <>
      {preview ? <PreviewBanner content={content.chrome.preview} liveHref="/education-scholarships1" /> : null}
      <PageHero title={landing.title} subtitle={landing.subtitle || undefined} />
      <section className="section">
        <div className="container prose">
          {landing.paragraphs.map((p) => (
            <ReadableParagraph key={p.slice(0, 48)} text={p} />
          ))}
          <GuideSections sections={landing.sections ?? []} />
          {landing.note ? <ReadableParagraph text={landing.note} /> : null}
          <p className="sticky-cta">
            <Link className="btn" href={landing.ctaHref || "/apply"}>
              {landing.ctaLabel || "Go to Apply"}
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
