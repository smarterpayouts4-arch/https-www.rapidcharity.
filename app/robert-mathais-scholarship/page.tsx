import type { Metadata } from "next";
import Link from "next/link";
import { ContentLink } from "@/components/ContentLink";
import { LandingBody } from "@/components/apply/LandingBody";
import { PageHero } from "@/components/PageHero";
import { PreviewBanner } from "@/components/PreviewBanner";
import { deadlineStatusSentence } from "@/lib/application/intakes";
import { loadSiteContent, resolvePreview } from "@/lib/content";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Robert Mathais Scholarship" , alternates: { canonical: `${site.url}/robert-mathais-scholarship` } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const params = searchParams ? await searchParams : undefined;
  const preview = await resolvePreview(params);
  const content = await loadSiteContent({ preview });
  const landing = content.apply.landings.robertMathais;

  return (
    <>
      {preview ? <PreviewBanner content={content.chrome.preview} liveHref="/robert-mathais-scholarship" /> : null}
      <PageHero title={landing.title} subtitle={landing.subtitle || undefined} />
      <section className="section">
        <div className="container prose">
          <LandingBody
            landing={landing}
            facts={[
              {
                label: "Who it's for",
                text: "Rapid Charity is pleased to introduce Robert Mathias Scholarship for students pursuing graduate studies in Business.",
              },
              {
                label: "Eligibility",
                text: "Only students studying business are eligible to apply for the Robert Mathais Scholarship.",
              },
              {
                label: "What it covers",
                text: "With this scholarship, it is our hope to continue his memory and legacy, supporting future generations to pursue their professional aspirations with the same spirit and dedication that Robert Mathias championed.",
              },
              {
                label: "Deadline",
                text: deadlineStatusSentence(content.intakes, new Date(), "robert-mathias"),
              },
            ]}
          />
          {landing.applyHref ? (
            <p>
              <ContentLink className="btn" href={landing.applyHref}>
                {landing.applyLabel || "Apply"}
              </ContentLink>
            </p>
          ) : null}
          <p>
            <Link className="tap-link" href={landing.backHref || "/apply"}>
              {landing.backLabel || "Back to Apply"}
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
