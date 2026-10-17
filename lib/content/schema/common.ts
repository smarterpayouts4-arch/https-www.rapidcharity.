import { z } from "zod";

export const linkSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});

export const navItemSchema = z.object({
  label: z.string().min(1),
  href: z.string().optional(),
  children: z.array(linkSchema).optional(),
});

export const mediaSchema = z.object({
  src: z.string().min(1),
  alt: z.string(),
});

export const scholarshipLandingSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional().default(""),
  paragraphs: z.array(z.string()).min(1),
  listItems: z.array(z.string()).optional().default([]),
  note: z.string().optional().default(""),
  applyLabel: z.string().optional().default("Apply"),
  applyHref: z.string().optional().default(""),
  backLabel: z.string().optional().default("Back to Apply"),
  backHref: z.string().optional().default("/apply"),
});
