import { z } from "zod";
import { OPTION_LISTS, allowedIds } from "./catalogs";
import { CURRENCIES, CYCLE_TERMS, GRADES, MAX_EDUCATION_ROWS, NURSING_FIELD_ID, PROVINCES, RAPID_SEMESTERS } from "./constants";
import { missingRequiredDocuments } from "./documents";
import { documentSlotLabel, documentUploadPrompt } from "./fieldLabels";
import { eligibilityIssues } from "./eligibility";
import { MAX_FILE_BYTES, MAX_PHOTO_BYTES, MAX_TOTAL_BYTES } from "./fileRules";
import { CLAIMED_KEYS } from "./steps";
import { ageInYears, isE164, isPakistanMobile, normalizeCnic, normalizePhone } from "./normalize";
import type { ApplicationInput, Choice, PromotedList, PromotedOption, ResultValue } from "./types";

const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const rapidSet = new Set<string>(RAPID_SEMESTERS);
const gradeSet = new Set<string>(GRADES);
const provinceSet = new Set<string>(PROVINCES);
const parentStatuses = ["Living", "Late", "Retired", "Unemployed"];
const units = ["semester", "prof", "year", "part", "paper"];

const choiceSchema = z.object({
  option_id: z.string().trim().max(80),
  other_text: z.string().trim().max(120, "Use 120 characters or fewer."),
});

const moneySchema = z.object({
  amount: z.number().int().nonnegative().max(1_000_000_000).nullable(),
  currency: z.enum(CURRENCIES),
  period: z.enum(["month", "semester", "year"]),
  value_state: z.enum(["known", "zero", "unknown"]),
});

const resultSchema = z.object({
  type: z.enum(["CGPA", "Percentage", "Grade", "Marks"]),
  value: z.number().nullable(),
  max: z.number().nullable(),
  grade: z.string().trim().max(8),
});

const checksSchema = z.object({
  magic_ok: z.boolean(),
  readable: z.boolean(),
  blur_score: z.number().nullable(),
  brightness: z.number().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  page_count: z.number().int().nullable(),
  warnings: z.array(z.string().max(240)).max(12),
  name_score: z.number().nullable(),
  cnic_match: z.boolean().nullable(),
  fee_extracted: z.number().nullable(),
  fee_match: z.boolean().nullable(),
  duplicate_across: z.boolean(),
  extracted_text: z.string().max(4000),
});

const documentSchema = z.object({
  slot: z.string().max(40),
  index: z.number().int(),
  storage: z.enum(["local", "google-drive", "cloudinary"]),
  file_id: z.string().max(300),
  path: z.string().max(300),
  url: z.string().max(500),
  mime: z.string().max(80),
  bytes: z.number().int().nonnegative(),
  sha256: z.string().max(64),
  checks: checksSchema,
  reused: z.boolean(),
});

function personName(label: string) {
  return z
    .string()
    .trim()
    .min(1, `Enter ${label}.`)
    .max(60, "Use 60 characters or fewer.")
    .regex(/^[\p{L}][\p{L} .'\-]*$/u, "Use letters, spaces, apostrophes, hyphens, or periods.");
}

export const applicationSchema = z.object({
  client_id: z.string().max(40),
  scholarship: z.string(),
  applicant_type: z.string(),
  first_name: personName("your first name"),
  last_name: personName("your last name"),
  full_name_as_on_cnic: z.string().trim().min(1, "Enter the full name on your CNIC.").max(120),
  date_of_birth: z.string(),
  gender: z.string(),
  disability: z.string(),
  disability_other: z.string().trim().max(80),
  marital_status: z.string(),
  spouse_name: z.string().trim().max(120),
  spouse_monthly_income: moneySchema,
  religion: choiceSchema,
  country: z.string(),
  cnic: z.string(),
  email: z.string().trim().email("Enter a valid email address."),
  email_confirm: z.string().trim(),
  mobile_phone: z.string(),
  secondary_phone: z.string(),
  address_line: z.string().trim().min(1, "Enter your current address.").max(200),
  permanent_same: z.string(),
  permanent_address: z.string().trim().max(200, "Use 200 characters or fewer."),
  city: choiceSchema,
  province: z.string(),
  employment_status: z.string(),
  employment_job: z.string().trim().max(80),
  employment_employer: z.string().trim().max(80),
  monthly_income: moneySchema,
  father_name: z.string().trim().min(1, "Enter your father's name.").max(60),
  mother_name: z.string().trim().min(1, "Enter your mother's name.").max(60),
  father_status: z.string(),
  mother_status: z.string(),
  father_occupation: choiceSchema,
  mother_occupation: choiceSchema,
  father_monthly_income: moneySchema,
  mother_monthly_income: moneySchema,
  guardian_phone: z.string(),
  guardian_relation: z.string(),
  guardian_name: z.string().trim().max(60, "Use 60 characters or fewer."),
  guardian_occupation: z.string().trim().max(80, "Use 80 characters or fewer."),
  family_monthly_income: z.number().int().nonnegative().max(100_000_000).nullable(),
  siblings_count: z.number().int().min(0).max(20).nullable(),
  siblings_studying_count: z.number().int().min(0).max(20).nullable(),
  siblings_working_count: z.number().int().min(0).max(20).nullable(),
  siblings_married_count: z.number().int().min(0).max(20).nullable(),
  siblings_other_count: z.number().int().min(0).max(20).nullable(),
  siblings_notes: z.string().trim().max(300, "Use 300 characters or fewer."),
  current_institution: choiceSchema,
  campus_city: choiceSchema,
  degree_level: choiceSchema,
  field_of_study: choiceSchema,
  program_title: z.string().trim().max(120),
  program_track: z.string(),
  program_track_other: z.string().trim().max(120),
  specialization: z.string().trim().max(80, "Use 80 characters or fewer."),
  study_years: z.number().int().nullable(),
  completion_term: z.string(),
  completion_year: z.number().int().nullable(),
  roll_number: z.string().trim().max(40),
  terms: z.array(
    z.object({
      term: z.string(),
      unit: z.string(),
      number: z.number().int().nullable(),
      status: z.string(),
      result: resultSchema,
    }),
  ),
  education: z
    .array(
      z.object({
        qualification: z.string(),
        qualification_other: z.string().trim().max(80, "Use 80 characters or fewer."),
        institution: z.string().trim().max(120, "Use 120 characters or fewer."),
        board: z.string().trim().max(120, "Use 120 characters or fewer."),
        status: z.string(),
        result_percent: z.number().nullable(),
        year: z.number().int().nullable(),
        proof_index: z.number().int().min(1).max(MAX_EDUCATION_ROWS).nullable(),
      }),
    )
    .max(MAX_EDUCATION_ROWS, `Add at most ${MAX_EDUCATION_ROWS} qualifications.`),
  current_semester: z.string(),
  current_gpa: z.number().nullable(),
  gpa_scale: z.string(),
  previous_institution: choiceSchema,
  previous_qualification: choiceSchema,
  previous_completion_year: z.number().int().nullable(),
  fee: moneySchema,
  amount_requested: z.number().int().nullable(),
  fee_due_date: z.string(),
  institution_phone: z.string(),
  institution_address: z.string().trim().max(200),
  rapid_received: z.string(),
  rapid_semesters: z.array(z.string()).max(16),
  rapid_amount: moneySchema,
  other_financial_support: z.string(),
  support_provider: choiceSchema,
  support_value_kind: z.string(),
  support_percent: z.number().nullable(),
  support_amount: moneySchema,
  heard_about: choiceSchema,
  church_name: z.string().trim().min(1, "Enter your church or place of worship.").max(120),
  denomination: choiceSchema,
  pastor_title: z.string(),
  pastor_title_other: z.string().trim().max(40),
  pastor_name: z.string().trim().min(1, "Enter the pastor's name.").max(120),
  pastor_phone: z.string(),
  pastor_email: z.string().trim().max(120),
  faculty_ref_name: z.string().trim().min(1, "Enter the faculty reference name.").max(120),
  faculty_ref_designation: z.string().trim().min(1, "Enter the faculty designation.").max(120),
  faculty_ref_phone: z.string(),
  faculty_ref_email: z.string().trim().email("Enter the faculty reference email."),
  family_ref_name: z.string().trim().min(1, "Enter the family reference name.").max(120),
  family_ref_relationship: choiceSchema,
  family_ref_phone: z.string(),
  family_ref_email: z.string().trim().max(120),
  attend_events: z.string(),
  financial_need_statement: z
    .string()
    .trim()
    .min(100, "Write at least 100 characters about your financial need.")
    .max(2000, "Use 2000 characters or fewer."),
  life_goal: z.string().trim().min(50, "Write at least 50 characters.").max(1500, "Use 1500 characters or fewer."),
  community_contribution: z.string().trim().min(50, "Write at least 50 characters.").max(1500, "Use 1500 characters or fewer."),
  plan_if_denied: z.string().trim().min(50, "Write at least 50 characters.").max(1500, "Use 1500 characters or fewer."),
  future_plan: z.string().trim().min(50, "Write at least 50 characters.").max(1500, "Use 1500 characters or fewer."),
  reuse_photo: z.boolean(),
  reuse_cnic: z.boolean(),
  reuse_guardian: z.boolean(),
  documents: z.array(documentSchema).max(16),
  consent_accepted: z.boolean(),
  consent_name: z.string().trim().max(120),
  website: z.string().max(200),
});

type Draft = z.infer<typeof applicationSchema>;

function twoDecimals(value: number): boolean {
  return Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;
}

function phoneIssue(value: string, pakistanMobile: boolean): string | null {
  const parsed = normalizePhone(value);
  if (!parsed.ok) return pakistanMobile ? "Enter a Pakistan mobile number, for example 0300 1234567." : "Enter a phone number with country code.";
  if (pakistanMobile && !isPakistanMobile(parsed.e164)) return "Enter a Pakistan mobile number, for example 0300 1234567.";
  if (!pakistanMobile && !isE164(parsed.e164)) return "Enter a valid phone number.";
  return null;
}

function optionalPhoneIssue(value: string, pakistanMobile: boolean): string | null {
  if (!value.trim()) return null;
  return phoneIssue(value, pakistanMobile);
}

function choiceIssue(choice: Choice, label: string, required: boolean): { path: string; message: string } | null {
  if (required && !choice.option_id) return { path: "option_id", message: `Choose ${label}.` };
  if (choice.option_id === "other" && !choice.other_text.trim()) return { path: "other_text", message: "Please specify." };
  return null;
}

function incomeIssue(money: Draft["fee"], allowUnknown: boolean): string | null {
  if (money.value_state === "unknown") {
    if (!allowUnknown) return "Enter an amount. A blank is not zero.";
    if (money.amount !== null) return "Clear the amount when income is unknown.";
    return null;
  }
  if (money.amount === null) return "Enter an amount or mark Unknown. A blank is not zero.";
  if (money.value_state === "zero" && money.amount !== 0) return "Enter 0 when the amount is zero.";
  if (money.value_state === "known" && money.amount === 0) return "Use the zero state when the amount is 0.";
  return null;
}

function resultIssue(result: ResultValue): { path: string; message: string } | null {
  if (result.type === "Grade") {
    if (!gradeSet.has(result.grade)) return { path: "grade", message: "Choose a grade from A+ to F." };
    return null;
  }
  if (result.type === "CGPA") {
    if (result.max !== 4 && result.max !== 5) return { path: "max", message: "CGPA is out of 4 or 5." };
    if (result.value === null || result.value < 0 || result.value > result.max || !twoDecimals(result.value)) {
      return { path: "value", message: `Enter a CGPA from 0 to ${result.max}.` };
    }
    return null;
  }
  if (result.type === "Percentage") {
    if (result.value === null || result.value < 0 || result.value > 100 || !twoDecimals(result.value)) {
      return { path: "value", message: "Enter a percentage from 0 to 100." };
    }
    return null;
  }
  if (result.value === null || result.max === null || !Number.isInteger(result.value) || !Number.isInteger(result.max)) {
    return { path: "value", message: "Enter marks obtained and the total." };
  }
  if (result.max <= 0 || result.value < 0 || result.value > result.max) {
    return { path: "value", message: "Marks obtained cannot be higher than the total." };
  }
  return null;
}

function optionalIncome(money: Draft["fee"]): string | null {
  if (money.value_state === "known" && money.amount === null) return null;
  return incomeIssue(money, true);
}

export function refineApplication(
  data: Draft,
  ctx: { addIssue: (issue: { code: "custom"; path: (string | number)[]; message: string }) => void },
  now: Date,
) {
  const add = (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });

  if (data.client_id && !UUID.test(data.client_id)) add(["client_id"], "The draft id is not valid.");
  if (!["john-ivy-azariah", "robert-mathias", "ivy-azariah"].includes(data.scholarship)) add(["scholarship"], "Choose a scholarship.");
  if (data.applicant_type !== "new" && data.applicant_type !== "continuing") add(["applicant_type"], "Choose New or Continuing.");
  if (!DATE.test(data.date_of_birth)) add(["date_of_birth"], "Enter your date of birth.");
  else {
    const age = ageInYears(data.date_of_birth, now);
    if (age === null || age < 14 || age > 60) add(["date_of_birth"], "Applicants must be 14 to 60 years old.");
  }
  if (data.gender !== "Female" && data.gender !== "Male") add(["gender"], "Choose Female or Male.");
  if (!["none", "visual", "hearing", "physical", "other"].includes(data.disability)) add(["disability"], "Choose a disability status.");
  if (data.disability === "other" && !data.disability_other.trim()) add(["disability_other"], "Please specify.");
  if (!["Single", "Married", "Widowed", "Divorced"].includes(data.marital_status)) add(["marital_status"], "Choose a marital status.");
  if (data.marital_status === "Married") {
    if (data.spouse_name.trim().length < 1) add(["spouse_name"], "Enter your spouse's name.");
    const spouseMoney = incomeIssue(data.spouse_monthly_income, false);
    if (spouseMoney) add(["spouse_monthly_income", "amount"], spouseMoney);
    else if (data.spouse_monthly_income.period !== "month" || data.spouse_monthly_income.currency !== "PKR") {
      add(["spouse_monthly_income", "amount"], "Spouse income is PKR per month.");
    }
  }
  const religion = choiceIssue(data.religion, "a community", true);
  if (religion) add(["religion", religion.path], religion.message);
  if (data.country !== "Pakistan") add(["country"], "Choose Pakistan.");
  const cnic = normalizeCnic(data.cnic);
  if (!cnic.ok) add(["cnic"], "Enter a 13-digit CNIC like 35202-1234567-1.");
  if (data.email_confirm.trim().toLowerCase() !== data.email.trim().toLowerCase()) add(["email_confirm"], "Email addresses do not match.");
  const mobile = phoneIssue(data.mobile_phone, true);
  if (mobile) add(["mobile_phone"], mobile);
  const secondary = optionalPhoneIssue(data.secondary_phone, true);
  if (secondary) add(["secondary_phone"], secondary);
  const city = choiceIssue(data.city, "a city", true);
  if (city) add(["city", city.path], city.message);
  if (!provinceSet.has(data.province)) add(["province"], "Choose a province.");
  if (data.permanent_same !== "Yes" && data.permanent_same !== "No") add(["permanent_same"], "Choose Yes or No.");
  if (data.permanent_same === "No" && !data.permanent_address.trim()) add(["permanent_address"], "Enter your permanent address.");
  if (data.employment_status !== "No" && data.employment_status !== "Yes") add(["employment_status"], "Choose No or Yes.");
  if (data.employment_status === "Yes") {
    if (!data.employment_job.trim()) add(["employment_job"], "Enter the job title.");
    if (!data.employment_employer.trim()) add(["employment_employer"], "Enter the employer.");
    const income = optionalIncome(data.monthly_income);
    if (income) add(["monthly_income", "amount"], income);
  }

  if (!parentStatuses.includes(data.father_status)) add(["father_status"], "Choose Living, Late, Retired, or Unemployed.");
  if (!parentStatuses.includes(data.mother_status)) add(["mother_status"], "Choose Living, Late, Retired, or Unemployed.");
  for (const [key, statusKey, label] of [
    ["father_occupation", "father_status", "your father's occupation"],
    ["mother_occupation", "mother_status", "your mother's occupation"],
  ] as const) {
    if (data[statusKey] === "Late") continue;
    const issue = choiceIssue(data[key], label, true);
    if (issue) add([key, issue.path], issue.message);
  }
  for (const [key, statusKey] of [
    ["father_monthly_income", "father_status"],
    ["mother_monthly_income", "mother_status"],
  ] as const) {
    if (data[statusKey] === "Late") continue;
    const issue = incomeIssue(data[key], true);
    if (issue) add([key, "amount"], issue);
    else if (data[key].currency !== "PKR" || data[key].period !== "month") add([key, "amount"], "Family income is PKR per month.");
  }
  if (!["father", "husband", "guardian"].includes(data.guardian_relation)) {
    add(["guardian_relation"], "Choose Father, Husband, or Other guardian.");
  }
  if (data.guardian_relation === "husband" && data.marital_status !== "Married") {
    add(["guardian_relation"], "Choose Husband only when your marital status is Married.");
  }
  if (data.guardian_relation === "guardian") {
    const guardianName = personName("the guardian's name").safeParse(data.guardian_name);
    if (!guardianName.success) add(["guardian_name"], guardianName.error.issues[0]?.message ?? "Enter the guardian's name.");
  }
  if ((data.guardian_relation === "husband" || data.guardian_relation === "guardian") && !data.guardian_occupation.trim()) {
    add(["guardian_occupation"], "Enter the guardian's occupation, for example Driver or Unemployed.");
  }
  if (data.family_monthly_income === null) add(["family_monthly_income"], "Enter the total family income per month in PKR. Use 0 if there is none.");
  const guardian = phoneIssue(data.guardian_phone, false);
  if (guardian) add(["guardian_phone"], guardian);
  if (data.siblings_count === null) add(["siblings_count"], "Enter how many siblings you have, excluding yourself. Use 0 if none.");
  for (const key of ["siblings_studying_count", "siblings_working_count", "siblings_married_count", "siblings_other_count"] as const) {
    if (data[key] === null) add([key], "Enter 0 if none.");
  }
  if (
    data.siblings_count !== null &&
    data.siblings_studying_count !== null &&
    data.siblings_working_count !== null &&
    data.siblings_married_count !== null &&
    data.siblings_other_count !== null
  ) {
    const sum = data.siblings_studying_count + data.siblings_working_count + data.siblings_married_count + data.siblings_other_count;
    if (sum > data.siblings_count) add(["siblings_count"], "Those counts cannot add up to more than the number of siblings, excluding yourself.");
  }

  const institution = choiceIssue(data.current_institution, "your institution", true);
  if (institution) add(["current_institution", institution.path], institution.message);
  const campus = choiceIssue(data.campus_city, "the campus city", true);
  if (campus) add(["campus_city", campus.path], campus.message);
  const level = choiceIssue(data.degree_level, "a degree level", true);
  if (level) add(["degree_level", level.path], level.message);
  const field = choiceIssue(data.field_of_study, "a field of study", true);
  if (field) add(["field_of_study", field.path], field.message);
  if (data.field_of_study.option_id === NURSING_FIELD_ID) {
    if (!["generic_bsn", "post_rn_bsn", "other"].includes(data.program_track)) add(["program_track"], "Choose Generic BSN, Post-RN BSN, or Other.");
    if (data.program_track === "other" && !data.program_track_other.trim()) add(["program_track_other"], "Please specify the nursing track.");
  }
  if (data.study_years === null || data.study_years < 1 || data.study_years > 7) add(["study_years"], "Enter the length of the program, from 1 to 7 years.");
  if (data.completion_term !== "Spring" && data.completion_term !== "Fall") add(["completion_term"], "Choose Spring or Fall.");
  const year = now.getUTCFullYear();
  if (data.completion_year === null || data.completion_year < year || data.completion_year > year + 7) {
    add(["completion_year"], `Enter a completion year from ${year} to ${year + 7}.`);
  }
  if (data.terms.length !== CYCLE_TERMS.length) add(["terms"], "Enter all five terms.");
  let declaredProgress = false;
  data.terms.forEach((term, index) => {
    const expected = CYCLE_TERMS[index];
    if (!expected || term.term !== expected.term) add(["terms", index, "term"], "Keep the prefilled term.");
    const future = expected?.future ?? false;
    if (future) {
      if (term.status !== "future") add(["terms", index, "status"], "Future terms only need the semester you expect.");
      if (!units.includes(term.unit)) add(["terms", index, "unit"], "Choose Semester, Prof, Year, Part, or Paper.");
      if (term.number === null || term.number < 1 || term.number > 12) add(["terms", index, "number"], "Enter the expected number, such as 8 for 8th semester.");
      return;
    }
    if (!["declared", "awaited", "failed_repeat", "delayed", "not_applicable"].includes(term.status)) {
      add(["terms", index, "status"], "Choose a result status. Use Awaited or Delayed instead of a made-up number.");
      return;
    }
    if (term.status === "not_applicable") return;
    declaredProgress = true;
    if (!units.includes(term.unit)) add(["terms", index, "unit"], "Choose Semester, Prof, Year, Part, or Paper.");
    if (term.number === null || term.number < 1 || term.number > 12) add(["terms", index, "number"], "Enter the term number.");
    if (term.status === "declared") {
      const issue = resultIssue(term.result);
      if (issue) add(["terms", index, "result", issue.path], issue.message);
    }
  });
  if (!declaredProgress) add(["terms"], "Enter at least one declared, awaited, delayed, or repeated term.");

  if (data.education.length < 1) add(["education"], "Add your qualifications, starting with Matriculation.");
  const proofIndexes = new Set<number>();
  data.education.forEach((row, index) => {
    if (!["matriculation", "intermediate", "bachelor", "other"].includes(row.qualification)) {
      add(["education", index, "qualification"], "Choose a qualification.");
    }
    if (row.qualification === "other" && !row.qualification_other.trim()) add(["education", index, "qualification_other"], "Name the qualification.");
    if (!row.institution.trim()) add(["education", index, "institution"], "Enter the school or college.");
    if (!row.board.trim()) add(["education", index, "board"], "Enter the board or university.");
    if (row.status !== "completed" && row.status !== "in_progress") add(["education", index, "status"], "Choose Completed or In progress.");
    if (row.status === "completed") {
      if (row.result_percent === null || row.result_percent < 0 || row.result_percent > 100 || !twoDecimals(row.result_percent)) {
        add(["education", index, "result_percent"], "Enter the result as a percentage from 0 to 100.");
      }
    } else if (row.result_percent !== null && (row.result_percent < 0 || row.result_percent > 100)) {
      add(["education", index, "result_percent"], "Enter the result as a percentage from 0 to 100.");
    }
    // Completed rows give the passing year; a row in progress gives the expected year, up to 8 years ahead.
    const latest = row.status === "in_progress" ? year + 8 : year + 1;
    if (row.year === null || row.year < 1990 || row.year > latest) add(["education", index, "year"], `Enter a year from 1990 to ${latest}.`);
    if (row.proof_index !== null) {
      if (proofIndexes.has(row.proof_index)) add(["education", index, "proof_index"], "Upload the proof for this row again.");
      proofIndexes.add(row.proof_index);
    }
  });
  const semesters = new Set(["not_started", ...Array.from({ length: 10 }, (_, index) => String(index + 1))]);
  if (!semesters.has(data.current_semester)) add(["current_semester"], "Choose your current semester.");
  const gpaOptional = data.current_semester === "not_started" || data.current_semester === "1";
  if (data.current_gpa === null) {
    if (!gpaOptional) add(["current_gpa"], "Enter your current GPA or CGPA.");
  } else {
    if (data.gpa_scale !== "4.00" && data.gpa_scale !== "5.00") add(["gpa_scale"], "Choose 4.00 or 5.00.");
    const max = data.gpa_scale === "5.00" ? 5 : 4;
    if (data.current_gpa < 0 || data.current_gpa > max || !twoDecimals(data.current_gpa)) add(["current_gpa"], `Enter a GPA from 0.00 to ${max.toFixed(2)}.`);
  }
  if (data.amount_requested === null || data.amount_requested < 1 || data.amount_requested > 10_000_000) {
    add(["amount_requested"], "Enter the amount you are requesting as a whole number of PKR.");
  }
  const previous = choiceIssue(data.previous_institution, "your previous institution", true);
  if (previous) add(["previous_institution", previous.path], previous.message);
  const stream = choiceIssue(data.previous_qualification, "your previous qualification", true);
  if (stream) add(["previous_qualification", stream.path], stream.message);
  if (data.previous_completion_year === null || data.previous_completion_year < 1990 || data.previous_completion_year > year) {
    add(["previous_completion_year"], `Enter a year from 1990 to ${year}.`);
  }
  const fee = incomeIssue(data.fee, false);
  if (fee) add(["fee", "amount"], fee);
  else if (data.fee.currency !== "PKR" || data.fee.period !== "semester") {
    add(["fee", "amount"], "Enter the upcoming term fee as a whole number of PKR, matching the voucher.");
  } else if (data.fee.amount === null || data.fee.amount < 1) {
    add(["fee", "amount"], "Enter the whole number printed on the fee voucher.");
  }
  if (!DATE.test(data.fee_due_date)) add(["fee_due_date"], "Enter the fee due date.");
  const institutionPhone = optionalPhoneIssue(data.institution_phone, false);
  if (institutionPhone) add(["institution_phone"], institutionPhone);

  if (data.rapid_received !== "Never" && data.rapid_received !== "Yes") add(["rapid_received"], "Choose Never or the terms you received support.");
  if (data.applicant_type === "continuing" && data.rapid_received === "Never") {
    add(["rapid_received"], "Continuing students have received a Rapid scholarship before.");
  }
  if (data.applicant_type === "new" && data.rapid_received === "Yes") {
    add(["rapid_received"], "Choose Continuing if you have received a Rapid scholarship before.");
  }
  if (data.rapid_received === "Yes") {
    if (data.rapid_semesters.length < 1 || data.rapid_semesters.some((item) => !rapidSet.has(item))) {
      add(["rapid_semesters"], "Choose the past term or terms you received support.");
    }
    const rapid = incomeIssue(data.rapid_amount, false);
    if (rapid) add(["rapid_amount", "amount"], rapid);
  }
  if (data.other_financial_support !== "No" && data.other_financial_support !== "Yes") {
    add(["other_financial_support"], "Choose No or Yes.");
  }
  if (data.other_financial_support === "Yes") {
    const provider = choiceIssue(data.support_provider, "the provider", true);
    if (provider) add(["support_provider", provider.path], provider.message);
    if (data.support_value_kind !== "percent" && data.support_value_kind !== "amount") add(["support_value_kind"], "Enter a percent or a PKR amount.");
    if (data.support_value_kind === "percent") {
      if (data.support_percent === null || data.support_percent < 0 || data.support_percent > 100 || !twoDecimals(data.support_percent)) {
        add(["support_percent"], "Enter a percent from 0 to 100.");
      }
    }
    if (data.support_value_kind === "amount") {
      const support = incomeIssue(data.support_amount, false);
      if (support) add(["support_amount", "amount"], support);
    }
  }
  const heard = choiceIssue(data.heard_about, "how you heard about Rapid", true);
  if (heard) add(["heard_about", heard.path], heard.message);
  const denomination = choiceIssue(data.denomination, "a denomination", false);
  if (denomination) add(["denomination", denomination.path], denomination.message);
  if (!["Pastor", "Rev.", "Fr.", "Bishop", "Other"].includes(data.pastor_title)) add(["pastor_title"], "Choose a title.");
  if (data.pastor_title === "Other" && !data.pastor_title_other.trim()) add(["pastor_title_other"], "Please specify the title.");
  const pastor = phoneIssue(data.pastor_phone, false);
  if (pastor) add(["pastor_phone"], pastor);
  if (data.pastor_email.trim() && !z.string().email().safeParse(data.pastor_email.trim()).success) {
    add(["pastor_email"], "Enter a valid email address, or leave this blank.");
  }
  const facultyPhone = phoneIssue(data.faculty_ref_phone, false);
  if (facultyPhone) add(["faculty_ref_phone"], facultyPhone);
  const relationship = choiceIssue(data.family_ref_relationship, "the relationship", true);
  if (relationship) add(["family_ref_relationship", relationship.path], relationship.message);
  const familyPhone = phoneIssue(data.family_ref_phone, false);
  if (familyPhone) add(["family_ref_phone"], familyPhone);
  if (data.family_ref_email.trim() && !z.string().email().safeParse(data.family_ref_email.trim()).success) {
    add(["family_ref_email"], "Enter a valid email, or leave this blank. Phone and email are separate.");
  }
  if (!["Yes", "No", "Maybe"].includes(data.attend_events)) add(["attend_events"], "Choose Yes, No, or Maybe.");

  if (data.applicant_type !== "continuing" && (data.reuse_photo || data.reuse_cnic || data.reuse_guardian)) {
    add(["reuse_photo"], "Only continuing students can reuse a document from the previous term.");
  }
  const seenSlots = new Map<string, string>();
  let total = 0;
  data.documents.forEach((document, index) => {
    if (document.reused) return;
    const fileName = documentSlotLabel(document.slot);
    if (!document.checks.magic_ok || !document.checks.readable) {
      add(["documents", index, "slot"], `${fileName} is unreadable or the wrong type. Replace that file.`);
    }
    if (!/^[a-f0-9]{64}$/.test(document.sha256)) add(["documents", index, "sha256"], `${fileName} was not checked. Upload it again.`);
    if (document.slot === "photo") {
      if (document.bytes < 1 || document.bytes > MAX_PHOTO_BYTES) add(["documents.photo"], "The passport-size photo must be 500 KB or smaller. Choose it again and it will be resized.");
      if (!["image/jpeg", "image/png"].includes(document.mime)) add(["documents.photo"], "The passport-size photo must be a JPG or PNG picture.");
    } else {
      if (document.bytes < 1 || document.bytes > MAX_FILE_BYTES) add(["documents", index, "bytes"], `${fileName} must be 5 MB or smaller.`);
      if (!["image/jpeg", "image/png", "application/pdf"].includes(document.mime)) add(["documents", index, "mime"], `${fileName} must be a JPG, PNG, or PDF.`);
    }
    if (document.slot === "education_proof" && !data.education.some((row) => row.proof_index === document.index)) {
      add(["documents", index, "slot"], "A qualification proof does not belong to any qualification row. Remove it and upload it again.");
    }
    const previousSlot = seenSlots.get(document.sha256);
    if (previousSlot && previousSlot !== document.slot) {
      add(["documents", index, "sha256"], `${fileName} is the same file as another slot. Upload the document that belongs here.`);
    }
    seenSlots.set(document.sha256, document.slot);
    total += document.bytes;
  });
  if (total > MAX_TOTAL_BYTES) add(["documents"], "All files together must be 25 MB or smaller.");
  const missingDocuments = missingRequiredDocuments(data as ApplicationInput);
  for (const slot of missingDocuments) {
    add(["documents", slot], documentUploadPrompt(slot));
  }
  if (data.consent_accepted !== true) add(["consent_accepted"], "Consent is required.");
  if (data.consent_name.trim().length < 2) add(["consent_name"], "Type your name to confirm.");
  for (const issue of eligibilityIssues({ scholarship: data.scholarship, gender: data.gender, fieldId: data.field_of_study.option_id })) {
    add(issue.path, issue.message);
  }
}

const CHOICE_LIST: Record<string, PromotedList> = {
  religion: "religions",
  city: "cities",
  father_occupation: "occupations",
  mother_occupation: "occupations",
  current_institution: "schools",
  campus_city: "cities",
  degree_level: "levels",
  field_of_study: "fields",
  previous_institution: "schools",
  previous_qualification: "streams",
  heard_about: "heard_about",
  denomination: "denominations",
  family_ref_relationship: "relationships",
  support_provider: "providers",
};

export function optionErrors(input: unknown, promoted: PromotedOption[]): Record<string, string> {
  if (!input || typeof input !== "object") return {};
  const record = input as Record<string, unknown>;
  const errors: Record<string, string> = {};
  for (const [key, listName] of Object.entries(CHOICE_LIST)) {
    const choice = record[key];
    if (!choice || typeof choice !== "object") continue;
    const optionId = "option_id" in choice && typeof choice.option_id === "string" ? choice.option_id : "";
    if (!optionId || optionId === "other") continue;
    const allowed = allowedIds(OPTION_LISTS[listName], promoted, listName);
    if (!allowed.has(optionId)) errors[`${key}.option_id`] = "Choose an option from the list.";
  }
  return errors;
}

export function issuesToFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

export function validateApplication(
  input: unknown,
  options?: { now?: Date; promoted?: PromotedOption[] },
): { ok: true; data: ApplicationInput } | { ok: false; fieldErrors: Record<string, string> } {
  const now = options?.now ?? new Date();
  const parsed = applicationSchema.clone().superRefine((data, ctx) => refineApplication(data, ctx, now)).safeParse(input);
  const fieldErrors = parsed.success ? {} : issuesToFieldErrors(parsed.error);
  for (const [key, message] of Object.entries(optionErrors(input, options?.promoted ?? []))) {
    if (!fieldErrors[key]) fieldErrors[key] = message;
  }
  if (!parsed.success || Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  return { ok: true, data: parsed.data as ApplicationInput };
}

export { FORM_STEPS } from "./steps";

/** True when an error key belongs to a step. Explicit dotted keys (documents.photo) win over their root (documents). */
export function keyInStep(key: string, fields: readonly string[]): boolean {
  const allowed = new Set(fields);
  for (const claimed of CLAIMED_KEYS) {
    if (key === claimed || key.startsWith(`${claimed}.`)) return allowed.has(claimed);
  }
  return allowed.has(key) || allowed.has(key.split(".")[0] ?? "");
}

export function errorsForStep(fieldErrors: Record<string, string>, fields: readonly string[]): Record<string, string> {
  return Object.fromEntries(Object.entries(fieldErrors).filter(([key]) => keyInStep(key, fields)));
}
