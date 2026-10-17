/**
 * Application windows. Dates are inclusive calendar days, not display copy.
 * An intake is open only between its opens date and its deadline. A later
 * intake with no opens date is the next scheduled window, not an open one.
 */
export type Intake = {
  id: string;
  name: string;
  opens?: string;
  deadline: string;
};

export const INTAKES: readonly Intake[] = [
  { id: "spring-2027", name: "Spring Semester 2027", opens: "2026-04-16", deadline: "2026-10-15" },
  { id: "fall-2027", name: "Fall Semester 2027", deadline: "2027-04-15" },
];

export type ApplicationStatus = {
  state: "open" | "closed";
  title: string;
  deadlineLabel: string;
  deadlineValue: string;
};

function calendarDay(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
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

export function applicationStatus(now = new Date()): ApplicationStatus {
  const today = calendarDay(now);
  const open = INTAKES.find((item) => item.opens && item.opens <= today && today <= item.deadline);
  if (open) {
    return {
      state: "open",
      title: `${open.name} Applications Open`,
      deadlineLabel: "Deadline",
      deadlineValue: formatIntakeDate(open.deadline),
    };
  }
  const next = INTAKES.find((item) => today <= item.deadline && (!item.opens || item.opens > today));
  return {
    state: "closed",
    title: "Applications closed",
    deadlineLabel: "Next intake",
    deadlineValue: next ? `${next.name}, ${formatIntakeDate(next.deadline)}` : "Not scheduled",
  };
}

export function deadlineStatusSentence(now = new Date()): string {
  const status = applicationStatus(now);
  if (status.state === "open") {
    return INTAKES.map((item) => `${item.name.replace(" Semester", "")}: ${formatIntakeDate(item.deadline)}.`).join(" ");
  }
  return `Applications closed. Next intake: ${status.deadlineValue}.`;
}

export function deadlineBandItems(now = new Date()) {
  const status = applicationStatus(now);
  const cycles = INTAKES.map((item) => ({
    title: item.name,
    body: `The last date of submitting online Scholarship Applications for ${item.name.replace("Semester ", "")} Semester is ${formatIntakeDate(item.deadline)}.`,
  }));
  return [
    {
      title: status.title,
      body: status.state === "open" ? `Deadline: ${status.deadlineValue}.` : `Next intake: ${status.deadlineValue}.`,
    },
    ...cycles,
  ];
}
