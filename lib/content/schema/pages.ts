import { z } from "zod";
import { linkSchema, scholarshipLandingSchema } from "./common";

const applyProgramSchema = z.object({
  id: z.string().min(1), heading: z.string().min(1), body: z.string().min(1),
  applyLabel: z.string().min(1), applyHref: z.string().min(1),
});
const deadlineItemSchema = z.object({ title: z.string().min(1), body: z.string().min(1) });

export const pageContentShape = {
  about: z.object({
    heroTitle: z.string(), heroSubtitle: z.string(),
    whoWeAre: z.object({ title: z.string(), lead: z.string(), body: z.string(), meta: z.array(z.string()).min(1), factsAriaLabel: z.string() }),
    mission: z.object({ title: z.string(), paragraphs: z.array(z.string()).min(1) }),
    whatWeDo: z.object({
      title: z.string(), intro: z.string(), scholarshipProgramsTitle: z.string(),
      scholarshipPrograms: z.array(z.object({ label: z.string(), href: z.string(), description: z.string() })),
      awardsTitle: z.string(), awards: z.array(z.string()).min(1),
    }),
    howItWorks: z.object({
      title: z.string(), intro: z.string(), steps: z.array(z.object({ title: z.string(), body: z.string() })),
      primaryCta: linkSchema, secondaryCta: linkSchema,
    }),
    leadership: z.object({ title: z.string(), body: z.string() }),
    contact: z.object({
      title: z.string(), emailLabel: z.string(), websiteLabel: z.string(), facebookLabel: z.string(), instagramLabel: z.string(),
      websiteDisplay: z.string(), facebookDisplay: z.string(), instagramDisplay: z.string(), facebookHref: z.string(),
      instagramHref: z.string(), websiteHref: z.string(), primaryCta: linkSchema, secondaryCta: linkSchema,
    }),
  }),
  apply: z.object({
    title: z.string(), intro: z.string(), programs: z.array(applyProgramSchema).min(1), closing: z.string(),
    contactEmail: z.string().email(), deadlinesAriaLabel: z.string(), deadlines: z.array(deadlineItemSchema).min(1),
    landings: z.object({
      criteria: scholarshipLandingSchema.extend({
        sections: z.array(z.object({
          title: z.string(), paragraphs: z.array(z.string()).optional().default([]),
          listItems: z.array(z.string()).optional().default([]), orderedItems: z.array(z.string()).optional().default([]),
        })).optional().default([]),
        ctaLabel: z.string().optional().default("Go to Apply"), ctaHref: z.string().optional().default("/apply"),
      }),
      johnIvy: scholarshipLandingSchema, robertMathais: scholarshipLandingSchema, ivyAzariah: scholarshipLandingSchema,
    }),
  }),
  donate: z.object({
    heroTitle: z.string(), ctaLabel: z.string(), paypalHref: z.string().min(1), intro: z.string(), heroImage: z.string(),
    heroImageAlt: z.string(), dearTitleAccent: z.string(), dearTitleRest: z.string(), dearParagraphs: z.array(z.string()).min(1),
    donateLinkPhrase: z.string(), thanksLine: z.string(), thanksTeam: z.string(), thanksImage: z.string(),
    thanksImageAlt: z.string(), thanksAriaLabel: z.string(), shareTitle: z.string(),
  }),
  reports: z.object({
    heroTitle: z.string(), heroSubtitle: z.string(), featuredEyebrow: z.string(), reportTitle: z.string(),
    reportDescription: z.string(), downloadLabel: z.string(), pptxPath: z.string(), publicSrc: z.string(),
    officeEmbedSrc: z.string(), iframeTitle: z.string(), noteBefore: z.string(), noteLinkLabel: z.string(), noteAfter: z.string(),
  }),
  blog: z.object({ title: z.string(), subtitle: z.string() }),
  events: z.object({ title: z.string(), subtitle: z.string() }),
};
