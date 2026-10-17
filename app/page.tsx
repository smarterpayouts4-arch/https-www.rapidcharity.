import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  DonateBanner,
  Hero,
  ImpactStats,
  LatestNews,
  Leadership,
  MissionOverview,
  ReportsShowcase,
  ScholarshipPrograms,
  StudentStories,
} from "@/components/home";
import { PreviewBanner } from "@/components/PreviewBanner";
import { site } from "@/lib/site";
import {
  loadSiteContent,
  resolvePreview,
  type HomepageSectionId,
} from "@/lib/content";

export const metadata: Metadata = { alternates: { canonical: site.url } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function HomePage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const params = searchParams ? await searchParams : undefined;
  const preview = await resolvePreview(params);
  const content = await loadSiteContent({ preview });

  const sectionMap: Record<HomepageSectionId, ReactNode> = {
    hero: (
      <Hero content={content.hero} applicationCard={content.applicationCard} intakes={content.intakes} />
    ),
    missionOverview: <MissionOverview content={content.missionOverview} />,
    impactStats: <ImpactStats content={content.impactStats} />,
    scholarshipPrograms: (
      <ScholarshipPrograms content={content.scholarshipPrograms} />
    ),
    studentStories: <StudentStories content={content.studentStories} />,
    latestNews: <LatestNews content={content.latestNews} />,
    leadership: <Leadership content={content.leadership} />,
    reportsShowcase: (
      <ReportsShowcase content={content.reportsShowcase} remoteHref={content.reports.publicSrc} />
    ),
    donateBanner: <DonateBanner content={content.donateBanner} />,
  };

  return (
    <>
      {preview ? <PreviewBanner content={content.chrome.preview} liveHref="/" /> : null}
      {content.homepage.sections
        .filter((s) => s.visible)
        .map((s) => (
          <div key={s.id}>{sectionMap[s.id]}</div>
        ))}
    </>
  );
}
