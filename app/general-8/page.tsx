import type { Metadata } from "next";
import Link from "next/link";
import { ContentLink } from "@/components/ContentLink";
import { deadlineFact, LandingBody } from "@/components/apply/LandingBody";
import { PageHero } from "@/components/PageHero";
import { PreviewBanner } from "@/components/PreviewBanner";
import { deadlineCycleItems } from "@/lib/application/intakes";
import { loadSiteContent, resolvePreview } from "@/lib/content";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "John-Ivy Azariah Scholarship" , alternates: { canonical: `${site.url}/general-8` } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const params = searchParams ? await searchParams : undefined;
  const preview = await resolvePreview(params);
  const content = await loadSiteContent({ preview });
  const landing = content.apply.landings.johnIvy;

  return (
    <>
      {preview ? <PreviewBanner content={content.chrome.preview} liveHref="/general-8" /> : null}
      <PageHero title={landing.title} subtitle={landing.subtitle || undefined} />
      <section className="section">
        <div className="container prose">
          <LandingBody
            landing={landing}
            facts={[
              {
                label: "Who it's for",
                text: "The John & Ivy Azariah Scholarship, established by their children, is a beacon of hope for promising Christian Pakistani minority students pursuing higher education.",
              },
              {
                label: "Eligibility",
                text: "The John-Ivy Azariah Scholarship is open to all students except those pursuing a business degree.",
              },
              {
                label: "What it covers",
                text: "This scholarship honors their legacy by providing financial support to high-achieving students from minority backgrounds, enabling them to access top-tier educational opportunities and achieve their professional dreams.",
              },
              deadlineFact(deadlineCycleItems(content.intakes, "john-ivy-azariah")),
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
