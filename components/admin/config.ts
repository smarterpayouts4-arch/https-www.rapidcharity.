import type { HomepageSectionId, SiteContent } from "@/lib/content/schema";

export type Tab =
  | "home"
  | "about"
  | "apply"
  | "donate"
  | "reports"
  | "news"
  | "events"
  | "chrome"
  | "nav"
  | "footer"
  | "verified"
  | "applications";

export type ContentPath = Array<string | number>;
export type ContentChange = (path: ContentPath, value: unknown) => void;

export const TABS: Array<{ id: Tab; label: string; previewPath: string }> = [
  { id: "home", label: "Home", previewPath: "/?preview=1" },
  { id: "about", label: "About", previewPath: "/about-us?preview=1" },
  { id: "apply", label: "Apply", previewPath: "/apply?preview=1" },
  { id: "donate", label: "Donate", previewPath: "/donate?preview=1" },
  { id: "reports", label: "Reports", previewPath: "/reports?preview=1" },
  { id: "news", label: "News posts", previewPath: "/blog?preview=1" },
  { id: "events", label: "Events list", previewPath: "/events?preview=1" },
  { id: "chrome", label: "Shared chrome", previewPath: "/blog?preview=1" },
  { id: "nav", label: "Navigation", previewPath: "/?preview=1" },
  { id: "footer", label: "Footer", previewPath: "/?preview=1" },
  { id: "verified", label: "Verified facts", previewPath: "/?preview=1" },
  { id: "applications", label: "Applications", previewPath: "/apply/form" },
];

export const SECTION_LABELS: Record<HomepageSectionId, string> = {
  hero: "Hero",
  missionOverview: "Who We Are (Mission)",
  impactStats: "Impact Stats",
  scholarshipPrograms: "Scholarship Programs",
  studentStories: "Student Stories",
  latestNews: "Latest News",
  leadership: "Leadership",
  reportsShowcase: "Reports Showcase",
  donateBanner: "Donate Banner",
};

export const HOME_KEYS: Array<keyof SiteContent> = [
  "hero",
  "applicationCard",
  "missionOverview",
  "impactStats",
  "scholarshipPrograms",
  "studentStories",
  "latestNews",
  "leadership",
  "reportsShowcase",
  "donateBanner",
  "aboutTeaser",
];
