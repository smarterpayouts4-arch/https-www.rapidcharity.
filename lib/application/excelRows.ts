import {
  fieldOptions,
  heardAboutOptions,
  occupationOptions,
  religionOptions,
  relationshipOptions,
  schoolOptions,
} from "./catalogs";
import { optionLabel } from "./labels";
import type { Money, StoredApplication, TermRow } from "./types";

export const EXCEL_HEADERS = [
  "S.No",
  "Full Name",
  "Contact",
  "Gender/Religion",
  "Address",
  "Employment",
  "Father's Occupation & income",
  "Mother occupation Salary",
  "Siblings",
  "Church/Worship place",
  "Pastor/Priest",
  "Degree Programme",
  "College/University",
  "College/University Address",
  "Term 1",
  "Term 2",
  "Term 3",
  "Term 4",
  "Term 5",
  "Period of Study",
  "Last semester to study",
  "Total Fee",
  "50% fee",
  "How did you come to know RAPID",
  "RAPID before",
  "Other scholarship",
  "Goal & Dream",
  "Support community",
  "Faculty reference",
  "Family reference",
  "Remarks if any",
] as const;

export function termHeaders(terms: string[]): string[] {
  const headers: string[] = [...EXCEL_HEADERS];
  terms.slice(0, 5).forEach((term, index) => {
    headers[14 + index] = term;
  });
  const current = terms[2] ?? "Spring 2027";
  headers[21] = `Total Fee for ${current}`;
  headers[22] = `50% fee for ${current}`;
  return headers;
}

export function formatMobileExport(e164: string): string {
  if (/^\+923\d{9}$/.test(e164)) {
    const local = `0${e164.slice(3)}`;
    return `${local.slice(0, 4)}-${local.slice(4)}`;
  }
  return e164;
}

export function formatRapidTerms(terms: string[]): string {
  const parsed = terms
    .map((term) => {
      const match = /^(Spring|Fall) (\d{4})$/.exec(term);
      return match ? { season: match[1] ?? "", year: Number(match[2]) } : null;
    })
    .filter((item): item is { season: string; year: number } => Boolean(item))
    .sort((left, right) => left.year - right.year || (left.season === "Spring" ? -1 : 1));
  const byYear = new Map<number, Set<string>>();
  for (const item of parsed) {
    const set = byYear.get(item.year) ?? new Set<string>();
    set.add(item.season);
    byYear.set(item.year, set);
  }
  const parts: string[] = [];
  for (const [year, seasons] of byYear) {
    if (seasons.has("Spring") && seasons.has("Fall")) parts.push(`Spring-Fall ${year}`);
    else if (seasons.has("Spring")) parts.push(`Spring ${year}`);
    else parts.push(`Fall ${year}`);
  }
  return parts.join(", ");
}

function ordinal(value: number): string {
  const tens = value % 100;
  const ones = value % 10;
  if (ones === 1 && tens !== 11) return `${value}st`;
  if (ones === 2 && tens !== 12) return `${value}nd`;
  if (ones === 3 && tens !== 13) return `${value}rd`;
  return `${value}th`;
}

const UNIT_LABEL: Record<string, string> = {
  semester: "Semester",
  prof: "Prof",
  year: "Year",
  part: "Part",
  paper: "Paper",
};

export function formatTermCell(row: TermRow): { text: string; flag: boolean } {
  const unit = UNIT_LABEL[row.unit] ?? "";
  const prefix = row.number ? `${ordinal(row.number)} ${unit}`.trim() : unit;
  if (row.status === "future") return { text: prefix, flag: false };
  if (row.status === "not_applicable" || row.status === "") return { text: "", flag: false };
  if (row.status === "awaited") return { text: `${prefix} awaited`.trim(), flag: true };
  if (row.status === "delayed") return { text: `${prefix} delayed`.trim(), flag: true };
  if (row.status === "failed_repeat") return { text: `${prefix} pass`.trim(), flag: true };
  if (row.result.type === "Marks" && row.result.value !== null && row.result.max !== null) {
    return { text: `${prefix} ${row.result.value}/${row.result.max}`.trim(), flag: false };
  }
  if (row.result.type === "Percentage" && row.result.value !== null) {
    return { text: `${prefix} ${row.result.value}%`.trim(), flag: false };
  }
  if (row.result.type === "Grade" && row.result.grade) return { text: `${prefix} ${row.result.grade}`.trim(), flag: false };
  if (row.result.value !== null) return { text: `${prefix} ${row.result.value}`.trim(), flag: false };
  return { text: prefix, flag: false };
}

function incomeK(money: Money): string {
  if (money.value_state === "unknown" || money.amount === null) return "";
  if (money.amount === 0) return "0";
  if (money.amount >= 1000) return `${Math.round(money.amount / 1000)}K`;
  return String(money.amount);
}

export function parentExport(name: string, status: string, occupation: string, income: Money): string {
  const clean = name.trim();
  if (status === "Late") return `${clean} Late`.trim();
  if (status === "Retired") return [clean, "Retd", incomeK(income)].filter(Boolean).join(" ");
  if (status === "Unemployed") return [clean, "Unemployed", incomeK(income)].filter(Boolean).join(" ");
  return [clean, occupation, incomeK(income)].filter(Boolean).join(" ");
}

export function siblingsExport(item: StoredApplication): string {
  const parts: string[] = [];
  if (item.siblings_studying_count) parts.push(`${item.siblings_studying_count} studying`);
  if (item.siblings_working_count) parts.push(`${item.siblings_working_count} working`);
  if (item.siblings_married_count) parts.push(`${item.siblings_married_count} married`);
  if (item.siblings_other_count) parts.push(`${item.siblings_other_count} other`);
  if (parts.length === 0) return String(item.siblings_count);
  return `${item.siblings_count}-${parts.join(", ")}`;
}

export function programExportLabel(item: StoredApplication): string {
  if (item.program_title.trim()) return item.program_title.trim();
  if (item.field_of_study.option_id === "nursing") {
    if (item.program_track === "generic_bsn") return "BS Nursing";
    if (item.program_track === "post_rn_bsn") return "Post-RN BSN";
    if (item.program_track_other.trim()) return item.program_track_other.trim();
  }
  return optionLabel(fieldOptions, item.field_of_study);
}

export function awardOf(item: StoredApplication): { amount: number; override: boolean } {
  const half = item.fee.amount === null ? 0 : Math.round(item.fee.amount / 2);
  if (item.review.award_override && item.review.award_amount !== null) {
    return { amount: item.review.award_amount, override: item.review.award_amount !== half };
  }
  return { amount: half, override: false };
}

export type SheetRow = {
  values: (string | number)[];
  female: boolean;
  yellowColumns: number[];
};

export function applicationToSheetRow(item: StoredApplication, serial: number): SheetRow {
  const religion = optionLabel(religionOptions, item.religion);
  const school = optionLabel(schoolOptions, item.current_institution);
  const campus = item.campus_city.option_id === "other" ? item.campus_city.other_text : item.campus_city.option_id;
  const addressLine = [item.institution_address, item.institution_phone, campus].filter(Boolean).join(", ");
  const terms = item.terms.map(formatTermCell);
  const award = awardOf(item);
  const employed = item.employment_status === "Yes";
  const otherYes = item.other_financial_support === "Yes";
  const provider =
    item.support_provider === null
      ? ""
      : item.support_provider.option_id === "other"
        ? item.support_provider.other_text
        : item.support_provider.option_id.replaceAll("_", " ");
  const supportValue =
    item.support_value_kind === "percent" && item.support_percent !== null
      ? `${item.support_percent}%`
      : item.support_amount?.amount !== null && item.support_amount?.amount !== undefined
        ? String(item.support_amount.amount)
        : "";
  const yellow = new Set<number>();
  if (employed) yellow.add(6);
  terms.forEach((term, index) => {
    if (term.flag) yellow.add(15 + index);
  });
  if (award.override) yellow.add(23);
  if (otherYes) yellow.add(26);
  const fatherOccupation = optionLabel(occupationOptions, item.father_occupation);
  const motherOccupation = optionLabel(occupationOptions, item.mother_occupation);
  const relationship = optionLabel(relationshipOptions, item.family_ref_relationship);
  const values: (string | number)[] = [
    serial,
    item.disability === "visual" ? `${item.full_name_as_on_cnic} / BLIND` : item.full_name_as_on_cnic,
    `${formatMobileExport(item.mobile_phone)}\n${item.email}`,
    `${item.gender} ${religion}`.trim(),
    item.address_line,
    employed ? `Yes ${item.employment_job}, ${item.employment_employer}`.trim() : "No",
    parentExport(item.father_name, item.father_status, fatherOccupation, item.father_monthly_income),
    parentExport(item.mother_name, item.mother_status, motherOccupation, item.mother_monthly_income),
    siblingsExport(item),
    item.church_name,
    `${item.pastor_title === "Other" ? item.pastor_title_other : item.pastor_title} ${item.pastor_name}`.trim(),
    programExportLabel(item),
    school,
    addressLine,
    ...terms.map((term) => term.text),
    `${item.study_years} ${item.study_years === 1 ? "Year" : "Years"}`,
    String(item.completion_year),
    item.fee.amount ?? 0,
    award.amount,
    optionLabel(heardAboutOptions, item.heard_about),
    item.rapid_received === "Never" ? "No" : formatRapidTerms(item.rapid_semesters),
    otherYes ? [provider, supportValue].filter(Boolean).join(" ") : "No",
    item.life_goal,
    item.community_contribution,
    item.faculty_ref_name,
    `${item.family_ref_name} ${relationship}`.trim(),
    item.review.remarks.map((remark) => remark.text).join("\n"),
  ];
  return { values, female: item.gender === "Female", yellowColumns: [...yellow] };
}
