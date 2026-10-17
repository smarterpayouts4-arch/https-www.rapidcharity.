import type { Metadata } from "next";
import Link from "next/link";
import { ContentLink } from "@/components/ContentLink";
import { deadlineFact, LandingBody } from "@/components/apply/LandingBody";
import { PageHero } from "@/components/PageHero";
import { PreviewBanner } from "@/components/PreviewBanner";
import { loadSiteContent, resolvePreview } from "@/lib/content";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Ivy Azariah Scholarship" , alternates: { canonical: `${site.url}/ivy-azariah-scholarship` } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const params = searchParams ? await searchParams : undefined;
  const preview = await resolvePreview(params);
  const content = await loadSiteContent({ preview });
  const landing = content.apply.landings.ivyAzariah;

  return (
    <>
      {preview ? <PreviewBanner content={content.chrome.preview} liveHref="/ivy-azariah-scholarship" /> : null}
      <PageHero title={landing.title} subtitle={landing.subtitle || undefined} />
      <section className="section">
        <div className="container prose">
          <LandingBody
            landing={landing}
            facts={[
              {
                label: "Who it's for",
                text: "For our wonderful grandmother we would like to give this award to an individual that is not looking for just making themselves better but how they could be an important part in the development of others as true success can be measured by the skills that can be passed from generation to generation.",
              },
              { label: "Eligibility", text: "Ivy Azariah Scholarship (for Women only)." },
              {
                label: "What it covers",
                text: "Ivy Azariah believed these qualities were the true measure of success: 1) respect for God, your family and yourself, 2) education and 3) discipline.",
              },
              deadlineFact(content.apply.deadlines),
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
            <Link href={landing.backHref || "/apply"}>
              {landing.backLabel || "Back to Apply"}
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
