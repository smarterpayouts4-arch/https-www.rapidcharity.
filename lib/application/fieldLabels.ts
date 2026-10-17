import { CYCLE_TERMS } from "./constants";

const LABELS: Record<string, string> = {
  scholarship: "Scholarship",
  applicant_type: "New or Continuing applicant",
  first_name: "First name",
  last_name: "Last name",
  full_name_as_on_cnic: "Full name as on CNIC",
  date_of_birth: "Date of birth",
  gender: "Gender",
  disability: "Disability",
  disability_other: "Disability",
  marital_status: "Marital status",
  spouse_name: "Spouse name",
  "spouse_monthly_income.amount": "Spouse monthly income",
  "religion.option_id": "Community",
  "religion.other_text": "Community",
  country: "Country",
  cnic: "National ID (CNIC)",
  email: "Email",
  email_confirm: "Confirm email",
  mobile_phone: "Mobile number",
  secondary_phone: "Alternate mobile",
  address_line: "Current address",
  permanent_same: "Permanent address same as current",
  permanent_address: "Permanent address",
  "city.option_id": "City",
  "city.other_text": "City",
  province: "Province",
  employment_status: "Are you currently employed?",
  employment_job: "Job title",
  employment_employer: "Employer",
  "monthly_income.amount": "Monthly income",
  father_name: "Father's name",
  mother_name: "Mother's name",
  father_status: "Father's status",
  mother_status: "Mother's status",
  "father_occupation.option_id": "Father's occupation",
  "father_occupation.other_text": "Father's occupation",
  "mother_occupation.option_id": "Mother's occupation",
  "mother_occupation.other_text": "Mother's occupation",
  "father_monthly_income.amount": "Father's monthly income",
  "mother_monthly_income.amount": "Mother's monthly income",
  guardian_phone: "Guardian phone",
  guardian_relation: "Father/Husband/Guardian",
  guardian_name: "Guardian name",
  guardian_occupation: "Guardian occupation",
  family_monthly_income: "Family monthly income (PKR)",
  education: "Education history",
  current_semester: "Current semester",
  current_gpa: "Current GPA",
  gpa_scale: "GPA scale",
  amount_requested: "Amount requested (PKR)",
  financial_need_statement: "Statement of financial need",
  siblings_count: "Siblings, excluding yourself",
  siblings_studying_count: "Siblings studying",
  siblings_working_count: "Siblings working",
  siblings_married_count: "Siblings married",
  siblings_other_count: "Siblings other",
  siblings_notes: "Notes about siblings",
  "current_institution.option_id": "Current institution",
  "current_institution.other_text": "Current institution",
  "campus_city.option_id": "Campus city",
  "campus_city.other_text": "Campus city",
  "degree_level.option_id": "Degree level",
  "degree_level.other_text": "Degree level",
  "field_of_study.option_id": "Field of study",
  "field_of_study.other_text": "Field of study",
  program_title: "Degree program",
  program_track: "Nursing track",
  program_track_other: "Nursing track",
  specialization: "Specialization",
  study_years: "Period of study",
  completion_term: "Completion term",
  completion_year: "Completion year",
  roll_number: "Roll number",
  terms: "Term results",
  "previous_institution.option_id": "Previous institution",
  "previous_institution.other_text": "Previous institution",
  "previous_qualification.option_id": "Previous qualification",
  "previous_qualification.other_text": "Previous qualification",
  previous_completion_year: "Previous completion year",
  "fee.amount": "Fee for the upcoming term",
  fee_due_date: "Fee due date",
  institution_phone: "Institution phone",
  institution_address: "Institution address",
  rapid_received: "Received a RAPID scholarship before",
  rapid_semesters: "Past terms",
  "rapid_amount.amount": "Amount received",
  other_financial_support: "Other scholarship or financial assistance",
  "support_provider.option_id": "Provider",
  "support_provider.other_text": "Provider",
  support_value_kind: "Support value",
  support_percent: "Percent",
  "support_amount.amount": "Support amount",
  "heard_about.option_id": "How did you hear about Rapid?",
  "heard_about.other_text": "How did you hear about Rapid?",
  church_name: "Church or place of worship",
  "denomination.option_id": "Denomination",
  "denomination.other_text": "Denomination",
  pastor_title: "Pastor or priest title",
  pastor_title_other: "Pastor or priest title",
  pastor_name: "Pastor or priest name",
  pastor_phone: "Pastor phone",
  pastor_email: "Pastor email",
  faculty_ref_name: "Faculty reference name",
  faculty_ref_designation: "Faculty designation",
  faculty_ref_phone: "Faculty phone",
  faculty_ref_email: "Faculty email",
  family_ref_name: "Family reference name",
  "family_ref_relationship.option_id": "Relationship",
  "family_ref_relationship.other_text": "Relationship",
  family_ref_phone: "Family reference phone",
  family_ref_email: "Family reference email",
  attend_events: "Can you attend Rapid events?",
  life_goal: "Life goal",
  community_contribution: "Community contribution",
  plan_if_denied: "Plan if this scholarship is not awarded",
  future_plan: "Plan after this program",
  documents: "Documents",
  reuse_photo: "Passport-size Photo reuse",
  reuse_cnic: "CNIC reuse",
  reuse_guardian: "Guardian document reuse",
  consent_accepted: "I agree",
  consent_name: "Type your full name",
  client_id: "Application id",
};

export const DOCUMENT_SLOT_LABELS: Record<string, string> = {
  photo: "Passport-size Photo",
  cnic: "Your CNIC or B-Form",
  guardian_cnic: "Father or guardian document",
  admission_proof: "Admission or enrollment proof",
  result: "Latest result or GPA transcript",
  fee_voucher: "Fee voucher",
  pastor_letter: "Recommendation letter from a priest, pastor or religious leader",
  income_proof: "Income proof",
  disability_certificate: "Disability certificate",
  other_award: "Other scholarship award letter",
  education_proof: "Qualification proof",
};

const TERM_PARTS: Record<string, string> = {
  term: "term",
  unit: "progress unit",
  number: "number",
  status: "result status",
  "result.value": "result",
  "result.max": "result total",
  "result.grade": "grade",
  "result.type": "result type",
};

export function documentSlotLabel(slot: string): string {
  return DOCUMENT_SLOT_LABELS[slot] ?? slot.replaceAll("_", " ");
}

/** Full sentence shown when a required slot is still empty. */
export const DOCUMENT_UPLOAD_PROMPTS: Record<string, string> = {
  photo: "Add your passport-size photo.",
  cnic: "Upload your CNIC or B-Form, front and back.",
  guardian_cnic: "Upload your father or guardian CNIC, or a death certificate.",
  admission_proof: "Upload your admission or enrollment proof, or your student ID.",
  result: "Upload your latest result or GPA transcript.",
  fee_voucher: "Upload your current fee voucher or challan.",
  pastor_letter: "Upload the recommendation letter from your priest, pastor or religious leader.",
  income_proof: "Upload income proof.",
  disability_certificate: "Upload your disability certificate.",
  other_award: "Upload your other scholarship award letter.",
};

export function documentUploadPrompt(slot: string): string {
  return DOCUMENT_UPLOAD_PROMPTS[slot] ?? `Upload ${documentSlotLabel(slot)}.`;
}

export function fieldLabel(key: string): string {
  if (LABELS[key]) return LABELS[key];
  const term = /^terms\.(\d+)\.(.+)$/.exec(key);
  if (term) {
    const name = CYCLE_TERMS[Number(term[1])]?.term ?? `Term ${Number(term[1]) + 1}`;
    const part = TERM_PARTS[term[2] ?? ""] ?? (term[2] ?? "result");
    return `${name} ${part}`;
  }
  const edu = /^education\.(\d+)\.(.+)$/.exec(key);
  if (edu) {
    const part: Record<string, string> = {
      qualification: "qualification",
      qualification_other: "qualification name",
      institution: "institution",
      board: "board or university",
      status: "status",
      result_percent: "result (%)",
      year: "year",
      proof_index: "proof",
    };
    return `Qualification ${Number(edu[1]) + 1} ${part[edu[2] ?? ""] ?? edu[2]}`;
  }
  const file = /^documents\.(\d+)\./.exec(key);
  if (file) return `Uploaded file ${Number(file[1]) + 1}`;
  const namedSlot = /^documents\.([a-z0-9_]+)$/.exec(key);
  if (namedSlot?.[1]) return documentSlotLabel(namedSlot[1]);
  const root = key.split(".")[0] ?? key;
  return LABELS[root] ?? root.replaceAll("_", " ");
}

export function namedFieldError(key: string, message: string): string {
  const label = fieldLabel(key);
  if (message.toLowerCase().startsWith(label.toLowerCase())) return message;
  return `${label}: ${message}`;
}
