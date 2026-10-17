import { z } from "zod";
import { linkSchema } from "./common";

export const homepageSectionIds = [
  "hero", "missionOverview", "impactStats", "scholarshipPrograms", "studentStories",
  "latestNews", "leadership", "reportsShowcase", "donateBanner",
] as const;
export type HomepageSectionId = (typeof homepageSectionIds)[number];

const pillarSchema = z.object({ title: z.string().min(1), body: z.string().min(1) });
const impactStatSchema = z.object({
  value: z.string().min(1), label: z.string().min(1), hint: z.string().optional().default(""),
  verified: z.boolean().optional().default(false),
});
const programCardSchema = z.object({
  href: z.string().min(1), title: z.string().min(1), blurb: z.string().min(1), image: z.string().min(1),
  alt: z.string().min(1), learnMoreLabel: z.string().optional().default("Learn More"),
});

export const homeContentShape = {
  homepage: z.object({ sections: z.array(z.object({ id: z.enum(homepageSectionIds), visible: z.boolean() })).min(1) }),
  hero: z.object({
    ariaLabel: z.string(), eyebrow: z.string(), titleLine1: z.string(), titleLine2: z.string(), lead: z.string(),
    primaryCta: linkSchema, secondaryCta: linkSchema, quote: z.string(), motif: z.string(), slidesAriaLabel: z.string(),
    slides: z.array(z.object({ src: z.string().min(1), alt: z.string().min(1), objectPosition: z.string().optional() })).min(1),
  }),
  applicationCard: z.object({
    ariaLabel: z.string(), title: z.string(), deadlineLabel: z.string(), deadlineValue: z.string(),
    programsLabel: z.string(), programsValue: z.string(), applyHref: z.string(), applyLabel: z.string(),
    guideHref: z.string(), guideLabel: z.string(),
  }),
  missionOverview: z.object({
    eyebrow: z.string(), title: z.string(), lead: z.string(), ctaLabel: z.string(), ctaHref: z.string(), quote: z.string(),
    video: z.object({
      src: z.string(), label: z.string(), poster: z.string(), ariaLabel: z.string(), facebookHref: z.string().optional(),
      embedUrl: z.string().optional().default(""),
      embedTitle: z.string(), unsupportedText: z.string(), downloadLabel: z.string(), missingText: z.string(),
    }),
    pillars: z.array(pillarSchema).min(1),
  }),
  impactStats: z.object({ eyebrow: z.string(), title: z.string(), stats: z.array(impactStatSchema).min(1) }),
  scholarshipPrograms: z.object({
    eyebrow: z.string(), title: z.string(), lead: z.string(), ctaLabel: z.string(), ctaHref: z.string(), programs: z.array(programCardSchema).min(1),
  }),
  studentStories: z.object({
    eyebrow: z.string(), title: z.string(), lead: z.string(), ctaLabel: z.string(), ctaHref: z.string(), image: z.string(),
    imageAlt: z.string(), playAriaLabel: z.string(), quote: z.string(), cite: z.string(), script: z.string(),
  }),
  latestNews: z.object({ eyebrow: z.string(), title: z.string(), ctaLabel: z.string(), ctaHref: z.string(), readMoreLabel: z.string() }),
  leadership: z.object({
    eyebrow: z.string(), title: z.string(), lead: z.string(), ctaLabel: z.string(), ctaHref: z.string(), listAriaLabel: z.string(),
    seats: z.array(z.object({ initials: z.string(), label: z.string() })).min(1),
  }),
  reportsShowcase: z.object({
    eyebrow: z.string(), title: z.string(), lead: z.string(), viewLabel: z.string(), viewHref: z.string(),
    downloadLabel: z.string(), downloadHref: z.string(), cardBadge: z.string(), cardEyebrow: z.string(),
    cardTitle: z.string(), cardMeta: z.string(), cardLinkLabel: z.string(),
  }),
  donateBanner: z.object({ title: z.string(), ctaLabel: z.string(), ctaHref: z.string(), script: z.string() }),
  aboutTeaser: z.object({ title: z.string(), body: z.string(), href: z.string() }),
};
