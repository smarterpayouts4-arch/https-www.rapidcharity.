/**
 * Helpers that line the website's applications up with the scholarship portal
 * (scholarship.rapidcharity.org): academic session codes, application numbers,
 * portal statuses and the portal-ordered CSV export.
 */
import { LEGACY_RELIGION_LABELS, LEGACY_WORKFLOW_MAP, SCHOLARSHIPS, WORKFLOW_STATUSES } from "./constants";
import { optionLabel } from "./labels";
import { occupationOptions, religionOptions, schoolOptions } from "./catalogs";
import type { LegacyWorkflowStatus, StatusHistoryEntry, StoredApplication, WorkflowStatus } from "./types";

const CYCLE = /^(spring|fall)-(\d{4})$/;

/** spring-2027 gives "SP2027"; fall-2027 gives "FA2027". Unknown ids give "". */
export function sessionCode(cycleId: string): string {
  const match = CYCLE.exec(cycleId);
  if (!match) return "";
  return `${match[1] === "spring" ? "SP" : "FA"}${match[2]}`;
}

/** spring-2027 gives "Spring 2027". */
export function sessionName(cycleId: string): string {
  const match = CYCLE.exec(cycleId);
  if (!match) return cycleId;
  return `${match[1] === "spring" ? "Spring" : "Fall"} ${match[2]}`;
}

export const APPLICATION_NUMBER = /^RAPID-(SP|FA)\d{4}-(\d{6})$/;

export function formatApplicationNumber(cycleId: string, sequence: number): string {
  const code = sessionCode(cycleId);
  if (!code) throw new Error("Unknown academic session.");
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 999_999) throw new Error("Application sequence out of range.");
  return `RAPID-${code}-${String(sequence).padStart(6, "0")}`;
}

/** The global sequence number inside RAPID-SP2027-000042 (42), or null. */
export function applicationSequence(value: string | undefined): number | null {
  const match = APPLICATION_NUMBER.exec(value ?? "");
  return match ? Number(match[2]) : null;
}

/** Next free sequence. The sequence is shared by every session, so numbers never repeat. */
export function nextApplicationSequence(existing: Array<string | undefined>): number {
  let max = 0;
  for (const value of existing) {
    const seq = applicationSequence(value);
    if (seq !== null && seq > max) max = seq;
  }
  return max + 1;
}

const STATUS_IDS = new Set<string>(WORKFLOW_STATUSES.map((item) => item.id));

export function isWorkflowStatus(value: unknown): value is WorkflowStatus {
  return typeof value === "string" && STATUS_IDS.has(value);
}

/** Maps any stored status (current or legacy) to a portal status. */
export function migrateWorkflow(value: unknown): { workflow: WorkflowStatus; legacy: LegacyWorkflowStatus | "" } {
  if (isWorkflowStatus(value)) return { workflow: value, legacy: "" };
  if (typeof value === "string" && value in LEGACY_WORKFLOW_MAP) {
    return { workflow: LEGACY_WORKFLOW_MAP[value as LegacyWorkflowStatus], legacy: value as LegacyWorkflowStatus };
  }
  return { workflow: "submitted", legacy: "" };
}

export function workflowLabel(value: string): string {
  return WORKFLOW_STATUSES.find((item) => item.id === value)?.label ?? "Submitted";
}

/**
 * Brings an application stored by any earlier version up to the current shape,
 * in memory: portal status (old value kept in legacy_workflow), a status history
 * that starts with the submission, and empty defaults for the new fields.
 */
export function normalizeStored(application: StoredApplication): StoredApplication {
  const review = { ...application.review };
  const migrated = migrateWorkflow(review.workflow);
  const legacy = review.legacy_workflow || migrated.legacy;
  review.workflow = migrated.workflow;
  review.legacy_workflow = legacy;
  review.rejection_reason = review.rejection_reason ?? "";
  review.remarks = Array.isArray(review.remarks) ? review.remarks : [];
  if (!Array.isArray(review.history) || review.history.length === 0) {
    const history: StatusHistoryEntry[] = [
      { at: application.submitted_at, from: "", to: "submitted", by: "Applicant", note: "" },
    ];
    if (migrated.workflow !== "submitted" || legacy) {
      history.push({
        at: application.submitted_at,
        from: legacy || "submitted",
        to: migrated.workflow,
        by: "Migration",
        note: legacy ? `Migrated from the earlier status ${legacy}.` : "",
      });
    }
    review.history = history;
  }
  return {
    ...application,
    application_number: application.application_number ?? "",
    education: Array.isArray(application.education) ? application.education : [],
    review,
  };
}

/** The latest status change made by a reviewer (not the submission itself). */
export function lastReview(application: StoredApplication): StatusHistoryEntry | null {
  const history = application.review.history ?? [];
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const entry = history[index];
    if (entry && entry.by !== "Applicant" && entry.to !== "submitted" && entry.to !== "draft") return entry;
  }
  return null;
}

export const PORTAL_CSV_HEADERS = [
  "Application Number",
  "Applicant Name",
  "Father / Guardian",
  "CNIC",
  "Gender",
  "Community",
  "Mobile Number",
  "Family Monthly Income",
  "Scholarship",
  "Academic Session",
  "Current Institution",
  "Degree Program",
  "Current Semester",
  "Current GPA",
  "GPA Scale",
  "Amount Requested",
  "Religious Leader",
  "Religious Leader Contact",
  "Status",
  "Submitted On",
  "Reviewed On",
  "Reviewed By",
  "Remarks",
  "Rejection Reason",
] as const;

export function formatCnicDigits(digits: string): string {
  const clean = digits.replace(/\D/g, "");
  if (clean.length !== 13) return digits;
  return `${clean.slice(0, 5)}-${clean.slice(5, 12)}-${clean.slice(12)}`;
}

/** +923001234567 gives 03001234567; other numbers are returned unchanged. */
export function localPhone(e164: string): string {
  if (/^\+92\d{10}$/.test(e164)) return `0${e164.slice(3)}`;
  return e164;
}

function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  const suffix = n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th";
  return `${n}${suffix}`;
}

/** "3" gives "3rd Semester"; "not_started" gives "Not started yet". */
export function semesterLabel(value: string | undefined): string {
  if (!value) return "";
  if (value === "not_started") return "Not started yet";
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? `${ordinal(n)} Semester` : value;
}

export function communityLabel(application: Pick<StoredApplication, "religion">): string {
  const id = application.religion?.option_id ?? "";
  if (LEGACY_RELIGION_LABELS[id]) return LEGACY_RELIGION_LABELS[id];
  return optionLabel(religionOptions, application.religion);
}

export function scholarshipName(id: string): string {
  const label = SCHOLARSHIPS.find((item) => item.id === id)?.label;
  return label ? `${label} Scholarship` : id;
}

export function guardianName(application: StoredApplication): string {
  if (application.guardian_name) return application.guardian_name;
  return application.father_name;
}

export function guardianOccupation(application: StoredApplication): string {
  if (application.guardian_occupation) return application.guardian_occupation;
  return optionLabel(occupationOptions, application.father_occupation);
}

/** Portal date format for the CSV: YYYY-MM-DD HH:mm in Pakistan time. */
export function portalDateTime(iso: string | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

export function institutionLabel(application: StoredApplication): string {
  return optionLabel(schoolOptions, application.current_institution);
}

/** One row in portal column order. The portal's own export leaves Current Institution blank; this one fills it. */
export function portalRow(input: StoredApplication): Record<(typeof PORTAL_CSV_HEADERS)[number], string> {
  const application = normalizeStored(input);
  const reviewed = lastReview(application);
  const pastor = [application.pastor_title === "Other" ? application.pastor_title_other : application.pastor_title, application.pastor_name]
    .filter(Boolean)
    .join(" ");
  return {
    "Application Number": application.application_number ?? "",
    "Applicant Name": application.full_name_as_on_cnic || `${application.first_name} ${application.last_name}`.trim(),
    "Father / Guardian": guardianName(application),
    CNIC: formatCnicDigits(application.cnic),
    Gender: application.gender,
    Community: communityLabel(application),
    "Mobile Number": localPhone(application.mobile_phone),
    "Family Monthly Income": application.family_monthly_income === null || application.family_monthly_income === undefined ? "" : String(application.family_monthly_income),
    Scholarship: scholarshipName(application.scholarship),
    "Academic Session": sessionName(application.cycle),
    "Current Institution": institutionLabel(application),
    "Degree Program": application.program_title,
    "Current Semester": semesterLabel(application.current_semester),
    "Current GPA": application.current_gpa === null || application.current_gpa === undefined ? "" : application.current_gpa.toFixed(2),
    "GPA Scale": application.current_gpa === null || application.current_gpa === undefined ? "" : application.gpa_scale ?? "",
    "Amount Requested": application.amount_requested === null || application.amount_requested === undefined ? "" : String(application.amount_requested),
    "Religious Leader": pastor,
    "Religious Leader Contact": localPhone(application.pastor_phone),
    Status: workflowLabel(application.review.workflow),
    "Submitted On": portalDateTime(application.submitted_at),
    "Reviewed On": reviewed ? portalDateTime(reviewed.at) : "",
    "Reviewed By": reviewed ? reviewed.by : "",
    Remarks: application.review.remarks.map((item) => item.text).join("; "),
    "Rejection Reason": application.review.workflow === "rejected" ? application.review.rejection_reason ?? "" : "",
  };
}
