import { z } from "zod";
import { footerSchema, navSchema, sharedChromeSchema } from "./chrome";
import { homeContentShape } from "./home";
import { pageContentShape } from "./pages";
import { verifiedSchema } from "./verified";

export const siteContentSchema = z.object({
  version: z.literal(1),
  updatedAt: z.string().optional(),
  nav: navSchema,
  footer: footerSchema,
  chrome: sharedChromeSchema,
  ...homeContentShape,
  ...pageContentShape,
  verified: verifiedSchema,
});

export type SiteContent = z.infer<typeof siteContentSchema>;
export function parseSiteContent(data: unknown): SiteContent {
  return siteContentSchema.parse(data);
}
