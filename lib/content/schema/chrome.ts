import { z } from "zod";
import { linkSchema, mediaSchema, navItemSchema } from "./common";

export const navSchema = z.object({
  brandName: z.string(), brandTag: z.string(), logo: mediaSchema, homeAriaLabel: z.string(),
  menuOpenLabel: z.string(), menuCloseLabel: z.string(), primaryAriaLabel: z.string(),
  items: z.array(navItemSchema).min(1), donateCta: linkSchema,
});

export const footerSchema = z.object({
  logo: mediaSchema, tagline: z.string(), quickLinksTitle: z.string(), quickLinks: z.array(linkSchema).min(1),
  contactTitle: z.string(), contactLines: z.array(z.string()).min(1), communityTitle: z.string(),
  subscribe: z.object({
    emailLabel: z.string(), placeholder: z.string(), submitLabel: z.string(), consentLabel: z.string(),
    successMessage: z.string(), mailSubject: z.string(), mailBodyIntro: z.string(),
  }),
  social: z.object({ facebook: linkSchema, instagram: linkSchema }), legal: z.array(linkSchema),
  legalAriaLabel: z.string(), contactLinkLabel: z.string(), copyrightName: z.string(),
  copyrightSuffix: z.string(), email: z.string().email(),
});

export const sharedChromeSchema = z.object({
  preview: z.object({ message: z.string(), liveLabel: z.string() }),
  share: z.object({
    heading: z.string(), ariaLabel: z.string(),
    labels: z.object({
      facebook: z.string(), x: z.string(), whatsapp: z.string(), linkedin: z.string(),
      pinterest: z.string(), copy: z.string(), copied: z.string(), copyAria: z.string(), copiedAria: z.string(),
    }),
  }),
  blog: z.object({
    searchLabel: z.string(), searchPlaceholder: z.string(), noResultsLabel: z.string(), allPostsLabel: z.string(),
    categoryAriaLabel: z.string(), categorySubtitle: z.string(), tagSubtitle: z.string(), recentPostsTitle: z.string(),
    seeAllLabel: z.string(), backLabel: z.string(), minReadSuffix: z.string(),
  }),
  notFound: z.object({ title: z.string(), subtitle: z.string(), body: z.string(), cta: linkSchema }),
});
