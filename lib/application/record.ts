import { APPLICATION_CYCLE } from "./constants";
import { placeholderDocument } from "./documents";
import { feeWithinTolerance, textContainsName } from "./fileRules";
import { normalizeCnic, normalizePhone } from "./normalize";
import type { ApplicationInput, Choice, DocumentChecks, ReviewItem, StoredApplication, StoredDocument } from "./types";

const OTHER_FIELDS: Array<keyof ApplicationInput> = [
  "religion",
  "city",
  "father_occupation",
  "mother_occupation",
  "current_institution",
  "campus_city",
  "degree_level",
  "field_of_study",
  "previous_institution",
  "previous_qualification",
  "heard_about",
  "denomination",
  "family_ref_relationship",
  "support_provider",
];

function isChoice(value: unknown): value is Choice {
  return Boolean(value && typeof value === "object" && "option_id" in value && "other_text" in value);
}

export function collectOtherFields(input: ApplicationInput): ReviewItem[] {
  const items: ReviewItem[] = [];
  for (const field of OTHER_FIELDS) {
    const choice = input[field];
    if (!isChoice(choice) || choice.option_id !== "other") continue;
    const other = choice.other_text.trim();
    if (!other) continue;
    items.push({ field, option_id: "other", other_text: other, reviewed: false });
  }
  if (input.program_track === "other" && input.program_track_other.trim()) {
    items.push({ field: "program_track", option_id: "other", other_text: input.program_track_other.trim(), reviewed: false });
  }
  if (input.disability === "other" && input.disability_other.trim()) {
    items.push({ field: "disability", option_id: "other", other_text: input.disability_other.trim(), reviewed: false });
  }
  if (input.pastor_title === "Other" && input.pastor_title_other.trim()) {
    items.push({ field: "pastor_title", option_id: "other", other_text: input.pastor_title_other.trim(), reviewed: false });
  }
  return items;
}

function mustPhone(raw: string): string {
  const parsed = normalizePhone(raw);
  if (!parsed.ok) throw new Error("Phone failed normalization after validation.");
  return parsed.e164;
}

function annotate(input: ApplicationInput, checks: DocumentChecks, slot: string): DocumentChecks {
  const warnings = [...checks.warnings];
  let nameScore = checks.name_score;
  let cnicMatch = checks.cnic_match;
  let feeMatch = checks.fee_match;
  if (checks.extracted_text.trim()) {
    const target = slot === "guardian_cnic" ? input.father_name : input.full_name_as_on_cnic;
    nameScore = textContainsName(checks.extracted_text, target);
    if (nameScore < 0.85) warnings.push("The name read from this file does not match the typed name closely.");
    if (slot === "cnic" || slot === "guardian_cnic") {
      const typed = normalizeCnic(input.cnic);
      if (typed.ok && checks.extracted_text.replace(/\D/g, "").includes(typed.digits)) cnicMatch = true;
      else if (typed.ok) {
        cnicMatch = false;
        warnings.push("The CNIC read from this file does not match the number you typed.");
      }
    }
  }
  if (slot === "fee_voucher" && checks.fee_extracted !== null && input.fee.amount !== null) {
    feeMatch = feeWithinTolerance(input.fee.amount, checks.fee_extracted);
    if (!feeMatch) warnings.push("The amount read from the voucher differs from the typed fee by more than 2%.");
  }
  return { ...checks, warnings: [...new Set(warnings)].slice(0, 12), name_score: nameScore, cnic_match: cnicMatch, fee_match: feeMatch };
}

function storedDocuments(input: ApplicationInput): StoredDocument[] {
  const documents: StoredDocument[] = input.documents
    .filter((document) => !document.reused)
    .map((document) => ({
      ...document,
      checks: annotate(input, document.checks, document.slot),
      review_state: "pending",
      review_reason: "",
      reupload_token: "",
    }));
  if (input.applicant_type === "continuing" && input.reuse_photo) documents.push(placeholderDocument("photo"));
  if (input.applicant_type === "continuing" && input.reuse_cnic) documents.push(placeholderDocument("cnic"));
  if (input.applicant_type === "continuing" && input.reuse_guardian) documents.push(placeholderDocument("guardian_cnic"));
  return documents;
}

export function buildSubmission(input: ApplicationInput, meta: { id: string; submittedAt: string }): StoredApplication {
  const cnic = normalizeCnic(input.cnic);
  const otherFields = collectOtherFields(input);
  const employed = input.employment_status === "Yes";
  const married = input.marital_status === "Married";
  const rapid = input.rapid_received === "Yes";
  const support = input.other_financial_support === "Yes";
  const nursing = input.field_of_study.option_id === "nursing";
  if (
    !cnic.ok ||
    (input.scholarship !== "john-ivy-azariah" && input.scholarship !== "robert-mathias" && input.scholarship !== "ivy-azariah") ||
    (input.applicant_type !== "new" && input.applicant_type !== "continuing") ||
    (input.gender !== "Female" && input.gender !== "Male") ||
    (input.disability !== "none" && input.disability !== "visual" && input.disability !== "hearing" && input.disability !== "physical" && input.disability !== "other") ||
    (input.marital_status !== "Single" && input.marital_status !== "Married" && input.marital_status !== "Widowed" && input.marital_status !== "Divorced") ||
    (input.employment_status !== "No" && input.employment_status !== "Yes") ||
    (input.father_status !== "Living" && input.father_status !== "Late" && input.father_status !== "Retired" && input.father_status !== "Unemployed") ||
    (input.mother_status !== "Living" && input.mother_status !== "Late" && input.mother_status !== "Retired" && input.mother_status !== "Unemployed") ||
    (input.rapid_received !== "Never" && input.rapid_received !== "Yes") ||
    (input.other_financial_support !== "No" && input.other_financial_support !== "Yes") ||
    (input.attend_events !== "Yes" && input.attend_events !== "No" && input.attend_events !== "Maybe") ||
    (input.completion_term !== "Spring" && input.completion_term !== "Fall") ||
    (input.pastor_title !== "Pastor" && input.pastor_title !== "Rev." && input.pastor_title !== "Fr." && input.pastor_title !== "Bishop" && input.pastor_title !== "Other") ||
    input.siblings_count === null ||
    input.siblings_studying_count === null ||
    input.siblings_working_count === null ||
    input.siblings_married_count === null ||
    input.siblings_other_count === null ||
    input.previous_completion_year === null ||
    input.study_years === null ||
    input.completion_year === null
  ) {
    throw new Error("Application failed validation before it was stored.");
  }

  const fatherLate = input.father_status === "Late";
  const motherLate = input.mother_status === "Late";
  return {
    id: meta.id,
    cycle: APPLICATION_CYCLE,
    cycle_cnic: `${APPLICATION_CYCLE}_${cnic.digits}`,
    submitted_at: meta.submittedAt,
    scholarship: input.scholarship,
    applicant_type: input.applicant_type,
    first_name: input.first_name.trim(),
    last_name: input.last_name.trim(),
    full_name_as_on_cnic: input.full_name_as_on_cnic.trim(),
    date_of_birth: input.date_of_birth,
    gender: input.gender,
    disability: input.disability,
    disability_other: input.disability === "other" ? input.disability_other.trim() : "",
    marital_status: input.marital_status,
    spouse_name: married ? input.spouse_name.trim() : "",
    spouse_monthly_income: married ? input.spouse_monthly_income : null,
    religion: input.religion,
    cnic: cnic.digits,
    cnic_raw: input.cnic.trim(),
    email: input.email.trim(),
    mobile_phone: mustPhone(input.mobile_phone),
    mobile_phone_raw: input.mobile_phone.trim(),
    secondary_phone: input.secondary_phone.trim() ? mustPhone(input.secondary_phone) : "",
    secondary_phone_raw: input.secondary_phone.trim(),
    address_line: input.address_line.trim(),
    city: input.city,
    province: input.province,
    employment_status: input.employment_status,
    employment_job: employed ? input.employment_job.trim() : "",
    employment_employer: employed ? input.employment_employer.trim() : "",
    monthly_income: employed && input.monthly_income.amount !== null ? input.monthly_income : null,
    father_name: input.father_name.trim(),
    mother_name: input.mother_name.trim(),
    father_status: input.father_status,
    mother_status: input.mother_status,
    father_occupation: fatherLate ? { option_id: "", other_text: "" } : input.father_occupation,
    mother_occupation: motherLate ? { option_id: "", other_text: "" } : input.mother_occupation,
    father_monthly_income: fatherLate ? { amount: null, currency: "PKR", period: "month", value_state: "unknown" } : input.father_monthly_income,
    mother_monthly_income: motherLate ? { amount: null, currency: "PKR", period: "month", value_state: "unknown" } : input.mother_monthly_income,
    guardian_phone: mustPhone(input.guardian_phone),
    guardian_phone_raw: input.guardian_phone.trim(),
    siblings_count: input.siblings_count,
    siblings_studying_count: input.siblings_studying_count,
    siblings_working_count: input.siblings_working_count,
    siblings_married_count: input.siblings_married_count,
    siblings_other_count: input.siblings_other_count,
    siblings_notes: input.siblings_notes.trim(),
    current_institution: input.current_institution,
    campus_city: input.campus_city,
    degree_level: input.degree_level,
    field_of_study: input.field_of_study,
    program_title: input.program_title.trim(),
    program_track: nursing ? input.program_track : "",
    program_track_other: nursing && input.program_track === "other" ? input.program_track_other.trim() : "",
    specialization: input.specialization.trim(),
    study_years: input.study_years,
    completion_term: input.completion_term,
    completion_year: input.completion_year,
    roll_number: input.roll_number.trim(),
    terms: input.terms,
    previous_institution: input.previous_institution,
    previous_qualification: input.previous_qualification,
    previous_completion_year: input.previous_completion_year,
    fee: input.fee,
    fee_due_date: input.fee_due_date,
    institution_phone: input.institution_phone.trim() ? mustPhone(input.institution_phone) : "",
    institution_phone_raw: input.institution_phone.trim(),
    institution_address: input.institution_address.trim(),
    rapid_received: input.rapid_received,
    rapid_semesters: rapid ? input.rapid_semesters : [],
    rapid_amount: rapid ? input.rapid_amount : null,
    other_financial_support: input.other_financial_support,
    support_provider: support ? input.support_provider : null,
    support_value_kind: support ? input.support_value_kind : "",
    support_percent: support && input.support_value_kind === "percent" ? input.support_percent : null,
    support_amount: support && input.support_value_kind === "amount" ? input.support_amount : null,
    heard_about: input.heard_about,
    church_name: input.church_name.trim(),
    denomination: input.denomination,
    pastor_title: input.pastor_title,
    pastor_title_other: input.pastor_title === "Other" ? input.pastor_title_other.trim() : "",
    pastor_name: input.pastor_name.trim(),
    pastor_phone: mustPhone(input.pastor_phone),
    pastor_phone_raw: input.pastor_phone.trim(),
    pastor_email: input.pastor_email.trim(),
    faculty_ref_name: input.faculty_ref_name.trim(),
    faculty_ref_designation: input.faculty_ref_designation.trim(),
    faculty_ref_phone: mustPhone(input.faculty_ref_phone),
    faculty_ref_phone_raw: input.faculty_ref_phone.trim(),
    faculty_ref_email: input.faculty_ref_email.trim(),
    family_ref_name: input.family_ref_name.trim(),
    family_ref_relationship: input.family_ref_relationship,
    family_ref_phone: mustPhone(input.family_ref_phone),
    family_ref_phone_raw: input.family_ref_phone.trim(),
    family_ref_email: input.family_ref_email.trim(),
    attend_events: input.attend_events,
    life_goal: input.life_goal.trim(),
    community_contribution: input.community_contribution.trim(),
    plan_if_denied: input.plan_if_denied.trim(),
    future_plan: input.future_plan.trim(),
    reuse_photo: input.applicant_type === "continuing" && input.reuse_photo,
    reuse_cnic: input.applicant_type === "continuing" && input.reuse_cnic,
    reuse_guardian: input.applicant_type === "continuing" && input.reuse_guardian,
    documents: storedDocuments(input),
    consent_name: input.consent_name.trim(),
    consent_accepted_at: meta.submittedAt,
    review: {
      status: otherFields.length > 0 ? "needs_review" : "clear",
      other_fields: otherFields,
      workflow: "submitted",
      award_amount: null,
      award_override: false,
      export_category: "",
      remarks: [],
      verified_flags: {},
    },
  };
}

export const FIELD_TO_PROMOTED_LIST = {
  religion: "religions",
  city: "cities",
  campus_city: "cities",
  father_occupation: "occupations",
  mother_occupation: "occupations",
  current_institution: "schools",
  previous_institution: "schools",
  degree_level: "levels",
  field_of_study: "fields",
  previous_qualification: "streams",
  heard_about: "heard_about",
  denomination: "denominations",
  family_ref_relationship: "relationships",
  support_provider: "providers",
} as const;
