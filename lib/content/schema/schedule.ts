import { z } from "zod";

/** Scholarship ids used to scope an intake. An empty list means "all scholarships". */
export const scholarshipIds = ["john-ivy-azariah", "robert-mathias", "ivy-azariah"] as const;
export type ScholarshipId = (typeof scholarshipIds)[number];

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const optionalIsoDate = z.union([isoDate, z.literal("")]).optional().default("");

export const intakeSchema = z
  .object({
    id: z.string().min(1),
    /** Display name, for example "Spring Semester 2027". */
    name: z.string().min(1),
    /** First day applications are accepted (inclusive). Empty = not announced yet. */
    opens: optionalIsoDate,
    /** Last day applications are accepted (inclusive). */
    deadline: isoDate,
    scholarships: z.array(z.enum(scholarshipIds)).optional().default([]),
  })
  .refine((item) => !item.opens || item.opens <= item.deadline, {
    message: "Opens date must be on or before the deadline",
    path: ["opens"],
  });

export const DEFAULT_INTAKES = {
  timezone: "Asia/Karachi",
  closingSoonDays: 14,
  items: [
    { id: "spring-2027", name: "Spring Semester 2027", opens: "2026-04-16", deadline: "2026-10-15", scholarships: [] },
    { id: "fall-2027", name: "Fall Semester 2027", opens: "", deadline: "2027-04-15", scholarships: [] },
  ],
};

export const intakesSchema = z
  .object({
    timezone: z.string().min(1).optional().default("Asia/Karachi"),
    closingSoonDays: z.number().int().min(0).max(90).optional().default(14),
    items: z.array(intakeSchema).min(1),
  })
  .superRefine((value, ctx) => {
    const ids = new Set<string>();
    value.items.forEach((item, index) => {
      if (ids.has(item.id)) ctx.addIssue({ code: "custom", path: ["items", index, "id"], message: `Duplicate intake id: ${item.id}` });
      ids.add(item.id);
    });
    try {
      new Intl.DateTimeFormat("en-CA", { timeZone: value.timezone });
    } catch {
      ctx.addIssue({ code: "custom", path: ["timezone"], message: `Unknown time zone: ${value.timezone}` });
    }
  });

export const DEFAULT_ANNOUNCEMENT = {
  enabled: false,
  text: "",
  linkLabel: "",
  linkHref: "",
  startsOn: "",
  endsOn: "",
};

export const announcementSchema = z.object({
  enabled: z.boolean().optional().default(false),
  text: z.string().optional().default(""),
  linkLabel: z.string().optional().default(""),
  linkHref: z.string().optional().default(""),
  /** Optional display window (inclusive, site time zone). Empty = no limit. */
  startsOn: optionalIsoDate,
  endsOn: optionalIsoDate,
});

export const scheduleContentShape = {
  intakes: intakesSchema.optional().default(DEFAULT_INTAKES),
  announcement: announcementSchema.optional().default(DEFAULT_ANNOUNCEMENT),
};

export type Intake = z.infer<typeof intakeSchema>;
export type IntakesConfig = z.infer<typeof intakesSchema>;
export type Announcement = z.infer<typeof announcementSchema>;
