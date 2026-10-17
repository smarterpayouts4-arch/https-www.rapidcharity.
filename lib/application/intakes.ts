/**
 * Application windows, driven by the admin-edited `site.intakes` content.
 * Dates are inclusive calendar days in the configured time zone
 * (Asia/Karachi by default). Status is computed per request, so it flips
 * from upcoming to open to closing soon to closed without a rebuild.
 */
import { DEFAULT_INTAKES, type Intake, type IntakesConfig, type ScholarshipId } from "@/lib/content/schema/schedule";

export type { Intake, IntakesConfig, ScholarshipId };
export { DEFAULT_INTAKES };

export type IntakeState = "upcoming" | "open" | "closing-soon" | "closed";

export type ApplicationStatus = {
  state: IntakeState;
  title: string;
  deadlineLabel: string;
  deadlineValue: string;
  intake?: Intake;
  daysLeft?: number;
};

type IntakeInput = Pick<IntakesConfig, "items"> & Partial<Pick<IntakesConfig, "timezone" | "closingSoonDays">>;

function normalize(config?: IntakeInput) {
  const source = config ?? DEFAULT_INTAKES;
  return {
    timezone: source.timezone || "Asia/Karachi",
    closingSoonDays: source.closingSoonDays ?? 14,
    items: [...source.items].sort((a, b) => a.deadline.localeCompare(b.deadline)) as Intake[],
  };
}

export function calendarDay(now: Date, timeZone = "Asia/Karachi"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function dayNumber(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

export function formatIntakeDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function intakesFor(config: IntakeInput | undefined, scholarship?: ScholarshipId): Intake[] {
  const { items } = normalize(config);
  if (!scholarship) return items;
  return items.filter((item) => !item.scholarships?.length || item.scholarships.includes(scholarship));
}

export function applicationStatus(
  config?: IntakeInput,
  now = new Date(),
  scholarship?: ScholarshipId,
): ApplicationStatus {
  const { timezone, closingSoonDays } = normalize(config);
  const items = intakesFor(config, scholarship);
  const today = calendarDay(now, timezone);
  const open = items.find((item) => item.opens && item.opens <= today && today <= item.deadline);
  if (open) {
    const daysLeft = dayNumber(open.deadline) - dayNumber(today);
    const closingSoon = daysLeft <= closingSoonDays;
    return {
      state: closingSoon ? "closing-soon" : "open",
      title: closingSoon ? `${open.name} Applications Closing Soon` : `${open.name} Applications Open`,
      deadlineLabel: "Deadline",
      deadlineValue: formatIntakeDate(open.deadline),
      intake: open,
      daysLeft,
    };
  }
  const next = items.find((item) => today <= item.deadline && (!item.opens || item.opens > today));
  if (next && next.opens) {
    return {
      state: "upcoming",
      title: `${next.name} Applications Open Soon`,
      deadlineLabel: "Opens",
      deadlineValue: `${formatIntakeDate(next.opens)}, deadline ${formatIntakeDate(next.deadline)}`,
      intake: next,
    };
  }
  return {
    state: "closed",
    title: "Applications closed",
    deadlineLabel: "Next intake",
    deadlineValue: next ? `${next.name}, ${formatIntakeDate(next.deadline)}` : "Not scheduled",
    intake: next,
  };
}

function shortName(name: string) {
  return name.replace(" Semester", "");
}

/** "Spring 2027: 15 October 2026; Fall 2027: 15 April 2027" */
export function deadlineSummary(config?: IntakeInput, scholarship?: ScholarshipId): string {
  return intakesFor(config, scholarship)
    .map((item) => `${shortName(item.name)}: ${formatIntakeDate(item.deadline)}`)
    .join("; ");
}

export function deadlineStatusSentence(config?: IntakeInput, now = new Date(), scholarship?: ScholarshipId): string {
  const status = applicationStatus(config, now, scholarship);
  if (status.state === "open" || status.state === "closing-soon") {
    return intakesFor(config, scholarship)
      .map((item) => `${shortName(item.name)}: ${formatIntakeDate(item.deadline)}.`)
      .join(" ");
  }
  if (status.state === "upcoming") return `${status.title}. Opens ${status.deadlineValue}.`;
  return `Applications closed. Next intake: ${status.deadlineValue}.`;
}

export function deadlineCycleItems(config?: IntakeInput, scholarship?: ScholarshipId) {
  return intakesFor(config, scholarship).map((item) => ({
    title: item.name,
    body: `The last date of submitting online Scholarship Applications for ${item.name.replace("Semester ", "")} Semester is ${formatIntakeDate(item.deadline)}.`,
  }));
}

export function deadlineBandItems(config?: IntakeInput, now = new Date(), scholarship?: ScholarshipId) {
  const status = applicationStatus(config, now, scholarship);
  const lead =
    status.state === "open" || status.state === "closing-soon"
      ? `Deadline: ${status.deadlineValue}.`
      : status.state === "upcoming"
        ? `Opens: ${status.deadlineValue}.`
        : `Next intake: ${status.deadlineValue}.`;
  return [{ title: status.title, body: lead }, ...deadlineCycleItems(config, scholarship)];
}

/** Replace {deadlines}, {currentIntake}, {currentDeadline} tokens in admin text. */
export function fillIntakeTokens(text: string, config?: IntakeInput, now = new Date()): string {
  if (!text.includes("{")) return text;
  const status = applicationStatus(config, now);
  return text
    .replaceAll("{deadlines}", deadlineSummary(config))
    .replaceAll("{currentIntake}", status.intake?.name ?? "")
    .replaceAll("{currentDeadline}", status.intake ? formatIntakeDate(status.intake.deadline) : "");
}
