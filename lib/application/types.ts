import type { ScholarshipId } from "./constants";

export type Currency = "PKR" | "USD" | "GBP" | "CAD";
export type MoneyPeriod = "month" | "semester" | "year";
export type ValueState = "known" | "zero" | "unknown";

export type Money = {
  amount: number | null;
  currency: Currency;
  period: MoneyPeriod;
  value_state: ValueState;
};

export type Choice = {
  option_id: string;
  other_text: string;
};

export type ResultValue = {
  type: "CGPA" | "Percentage" | "Grade" | "Marks";
  value: number | null;
  max: number | null;
  grade: string;
};

export type TermStatus = "" | "declared" | "awaited" | "failed_repeat" | "delayed" | "not_applicable" | "future";

export type TermRow = {
  term: string;
  unit: "" | "semester" | "prof" | "year" | "part" | "paper";
  number: number | null;
  status: TermStatus;
  result: ResultValue;
};

export type ParentStatus = "" | "Living" | "Late" | "Retired" | "Unemployed";
export type Disability = "" | "none" | "visual" | "hearing" | "physical" | "other";
export type PastorTitle = "" | "Pastor" | "Rev." | "Fr." | "Bishop" | "Other";

export type DocumentChecks = {
  magic_ok: boolean;
  readable: boolean;
  blur_score: number | null;
  brightness: number | null;
  width: number | null;
  height: number | null;
  page_count: number | null;
  warnings: string[];
  name_score: number | null;
  cnic_match: boolean | null;
  fee_extracted: number | null;
  fee_match: boolean | null;
  duplicate_across: boolean;
  extracted_text: string;
};

export type DocumentInput = {
  slot: string;
  index: number;
  storage: "local" | "google-drive" | "cloudinary";
  file_id: string;
  path: string;
  url: string;
  mime: string;
  bytes: number;
  sha256: string;
  checks: DocumentChecks;
  reused: boolean;
};

export type StoredDocument = DocumentInput & {
  review_state: "pending" | "verified" | "rejected" | "reupload";
  review_reason: string;
  reupload_token: string;
};

export type WorkflowStatus =
  | "submitted"
  | "incomplete"
  | "under_review"
  | "approved"
  | "rejected"
  | "did_not_reapply"
  | "pass_out";

export type PromotedList =
  | "schools"
  | "fields"
  | "levels"
  | "streams"
  | "cities"
  | "occupations"
  | "religions"
  | "denominations"
  | "heard_about"
  | "relationships"
  | "providers";

export type PromotedOption = {
  list: PromotedList;
  id: string;
  label: string;
  source_text: string;
  promoted_at: string;
};

export type ReviewItem = {
  field: string;
  option_id: string;
  other_text: string;
  reviewed: boolean;
};

export type ApplicationInput = {
  client_id: string;
  scholarship: ScholarshipId | "";
  applicant_type: "new" | "continuing" | "";
  first_name: string;
  last_name: string;
  full_name_as_on_cnic: string;
  date_of_birth: string;
  gender: "Female" | "Male" | "";
  disability: Disability;
  disability_other: string;
  marital_status: "Single" | "Married" | "Widowed" | "Divorced" | "";
  spouse_name: string;
  spouse_monthly_income: Money;
  religion: Choice;
  cnic: string;
  email: string;
  email_confirm: string;
  mobile_phone: string;
  secondary_phone: string;
  address_line: string;
  city: Choice;
  province: string;
  employment_status: "" | "No" | "Yes";
  employment_job: string;
  employment_employer: string;
  monthly_income: Money;
  father_name: string;
  mother_name: string;
  father_status: ParentStatus;
  mother_status: ParentStatus;
  father_occupation: Choice;
  mother_occupation: Choice;
  father_monthly_income: Money;
  mother_monthly_income: Money;
  guardian_phone: string;
  siblings_count: number | null;
  siblings_studying_count: number | null;
  siblings_working_count: number | null;
  siblings_married_count: number | null;
  siblings_other_count: number | null;
  siblings_notes: string;
  current_institution: Choice;
  campus_city: Choice;
  degree_level: Choice;
  field_of_study: Choice;
  program_title: string;
  program_track: "" | "generic_bsn" | "post_rn_bsn" | "other";
  program_track_other: string;
  specialization: string;
  study_years: number | null;
  completion_term: "" | "Spring" | "Fall";
  completion_year: number | null;
  roll_number: string;
  terms: TermRow[];
  previous_institution: Choice;
  previous_qualification: Choice;
  previous_completion_year: number | null;
  fee: Money;
  fee_due_date: string;
  institution_phone: string;
  institution_address: string;
  rapid_received: "" | "Never" | "Yes";
  rapid_semesters: string[];
  rapid_amount: Money;
  other_financial_support: "" | "No" | "Yes";
  support_provider: Choice;
  support_value_kind: "" | "percent" | "amount";
  support_percent: number | null;
  support_amount: Money;
  heard_about: Choice;
  church_name: string;
  denomination: Choice;
  pastor_title: PastorTitle;
  pastor_title_other: string;
  pastor_name: string;
  pastor_phone: string;
  pastor_email: string;
  faculty_ref_name: string;
  faculty_ref_designation: string;
  faculty_ref_phone: string;
  faculty_ref_email: string;
  family_ref_name: string;
  family_ref_relationship: Choice;
  family_ref_phone: string;
  family_ref_email: string;
  attend_events: "Yes" | "No" | "Maybe" | "";
  life_goal: string;
  community_contribution: string;
  plan_if_denied: string;
  future_plan: string;
  reuse_photo: boolean;
  reuse_cnic: boolean;
  reuse_guardian: boolean;
  documents: DocumentInput[];
  consent_accepted: boolean;
  consent_name: string;
  website: string;
};

export type StoredApplication = {
  id: string;
  cycle: string;
  cycle_cnic: string;
  submitted_at: string;
  scholarship: ScholarshipId;
  applicant_type: "new" | "continuing";
  first_name: string;
  last_name: string;
  full_name_as_on_cnic: string;
  date_of_birth: string;
  gender: "Female" | "Male";
  disability: Exclude<Disability, "">;
  disability_other: string;
  marital_status: "Single" | "Married" | "Widowed" | "Divorced";
  spouse_name: string;
  spouse_monthly_income: Money | null;
  religion: Choice;
  cnic: string;
  cnic_raw: string;
  email: string;
  mobile_phone: string;
  mobile_phone_raw: string;
  secondary_phone: string;
  secondary_phone_raw: string;
  address_line: string;
  city: Choice;
  province: string;
  employment_status: "No" | "Yes";
  employment_job: string;
  employment_employer: string;
  monthly_income: Money | null;
  father_name: string;
  mother_name: string;
  father_status: Exclude<ParentStatus, "">;
  mother_status: Exclude<ParentStatus, "">;
  father_occupation: Choice;
  mother_occupation: Choice;
  father_monthly_income: Money;
  mother_monthly_income: Money;
  guardian_phone: string;
  guardian_phone_raw: string;
  siblings_count: number;
  siblings_studying_count: number;
  siblings_working_count: number;
  siblings_married_count: number;
  siblings_other_count: number;
  siblings_notes: string;
  current_institution: Choice;
  campus_city: Choice;
  degree_level: Choice;
  field_of_study: Choice;
  program_title: string;
  program_track: string;
  program_track_other: string;
  specialization: string;
  study_years: number;
  completion_term: "Spring" | "Fall";
  completion_year: number;
  roll_number: string;
  terms: TermRow[];
  previous_institution: Choice;
  previous_qualification: Choice;
  previous_completion_year: number;
  fee: Money;
  fee_due_date: string;
  institution_phone: string;
  institution_phone_raw: string;
  institution_address: string;
  rapid_received: "Never" | "Yes";
  rapid_semesters: string[];
  rapid_amount: Money | null;
  other_financial_support: "No" | "Yes";
  support_provider: Choice | null;
  support_value_kind: "" | "percent" | "amount";
  support_percent: number | null;
  support_amount: Money | null;
  heard_about: Choice;
  church_name: string;
  denomination: Choice;
  pastor_title: Exclude<PastorTitle, "">;
  pastor_title_other: string;
  pastor_name: string;
  pastor_phone: string;
  pastor_phone_raw: string;
  pastor_email: string;
  faculty_ref_name: string;
  faculty_ref_designation: string;
  faculty_ref_phone: string;
  faculty_ref_phone_raw: string;
  faculty_ref_email: string;
  family_ref_name: string;
  family_ref_relationship: Choice;
  family_ref_phone: string;
  family_ref_phone_raw: string;
  family_ref_email: string;
  attend_events: "Yes" | "No" | "Maybe";
  life_goal: string;
  community_contribution: string;
  plan_if_denied: string;
  future_plan: string;
  reuse_photo: boolean;
  reuse_cnic: boolean;
  reuse_guardian: boolean;
  documents: StoredDocument[];
  consent_name: string;
  consent_accepted_at: string;
  review: {
    status: "clear" | "needs_review" | "reviewed";
    other_fields: ReviewItem[];
    workflow: WorkflowStatus;
    award_amount: number | null;
    award_override: boolean;
    export_category: string;
    remarks: { at: string; author: string; text: string }[];
    verified_flags: Record<string, boolean>;
  };
};
