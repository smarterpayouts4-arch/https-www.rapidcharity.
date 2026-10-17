import type { ScholarshipId } from "./constants";

export type HouseStatus = "" | "owned" | "rented" | "other";

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

/** Portal-aligned application statuses (scholarship.rapidcharity.org). */
export type WorkflowStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "waitlisted"
  | "withdrawn"
  | "closed";

/** Statuses written before the portal alignment. Read-only: they are migrated on read. */
export type LegacyWorkflowStatus = "incomplete" | "did_not_reapply" | "pass_out";

export type StatusHistoryEntry = {
  at: string;
  from: WorkflowStatus | LegacyWorkflowStatus | "";
  to: WorkflowStatus;
  by: string;
  note: string;
};

export type EducationQualification = "" | "matriculation" | "intermediate" | "bachelor" | "other";

export type EducationRow = {
  qualification: EducationQualification;
  qualification_other: string;
  institution: string;
  board: string;
  status: "" | "completed" | "in_progress";
  result_percent: number | null;
  year: number | null;
  /** Index of the optional `education_proof` document for this row (1 to 6), or null. */
  proof_index: number | null;
};

export type GuardianRelation = "" | "father" | "husband" | "guardian";
export type YesNo = "" | "Yes" | "No";

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
  country: "" | "Pakistan";
  cnic: string;
  email: string;
  email_confirm: string;
  mobile_phone: string;
  secondary_phone: string;
  address_line: string;
  permanent_same: YesNo;
  permanent_address: string;
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
  guardian_relation: GuardianRelation;
  guardian_name: string;
  guardian_occupation: string;
  family_monthly_income: number | null;
  /** Optional: people living in the household, including the applicant (asked on PEEF, HEC and NUST forms). */
  household_members?: number | null;
  /** Optional: how many of them earn. */
  earning_members?: number | null;
  /** Optional: house owned, rented, or other (Ehsaas, HEC and NUST forms ask this). */
  house_status?: HouseStatus;
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
  education: EducationRow[];
  current_semester: string;
  current_gpa: number | null;
  gpa_scale: "" | "4.00" | "5.00";
  previous_institution: Choice;
  previous_qualification: Choice;
  previous_completion_year: number | null;
  fee: Money;
  amount_requested: number | null;
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
  financial_need_statement: string;
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
  /** RAPID-<SESSIONCODE>-000001. Empty on applications stored before numbering existed. */
  application_number?: string;
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
  country?: string;
  cnic: string;
  cnic_raw: string;
  email: string;
  mobile_phone: string;
  mobile_phone_raw: string;
  secondary_phone: string;
  secondary_phone_raw: string;
  address_line: string;
  permanent_same?: "Yes" | "No";
  permanent_address?: string;
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
  guardian_relation?: Exclude<GuardianRelation, "">;
  /** Resolved Father/Husband/Guardian name (father, spouse, or the typed guardian). */
  guardian_name?: string;
  /** Resolved guardian occupation (father occupation label, or the typed text). */
  guardian_occupation?: string;
  family_monthly_income?: number | null;
  household_members?: number | null;
  earning_members?: number | null;
  house_status?: HouseStatus;
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
  education?: EducationRow[];
  current_semester?: string;
  current_gpa?: number | null;
  gpa_scale?: "" | "4.00" | "5.00";
  previous_institution: Choice;
  previous_qualification: Choice;
  previous_completion_year: number;
  fee: Money;
  amount_requested?: number | null;
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
  financial_need_statement?: string;
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
    /** Original value when an older status was migrated on read (e.g. pass_out). */
    legacy_workflow?: LegacyWorkflowStatus | "";
    /** Approved scholarship amount (PKR). Required when approving. */
    award_amount: number | null;
    rejection_reason?: string;
    history?: StatusHistoryEntry[];
    award_override: boolean;
    export_category: string;
    remarks: { at: string; author: string; text: string }[];
    verified_flags: Record<string, boolean>;
  };
};
