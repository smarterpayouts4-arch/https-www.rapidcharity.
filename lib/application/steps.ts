export const FORM_STEPS = [
  { id: "scholarship", label: "Scholarship", fields: ["scholarship", "applicant_type"] },
  {
    id: "personal",
    label: "Personal",
    fields: [
      "documents.photo", "reuse_photo", "first_name", "last_name", "full_name_as_on_cnic", "date_of_birth", "gender",
      "disability", "disability_other", "marital_status", "spouse_name", "spouse_monthly_income", "religion", "country",
      "cnic", "email", "email_confirm", "mobile_phone", "secondary_phone", "address_line", "city", "province",
      "permanent_same", "permanent_address", "employment_status", "employment_job", "employment_employer", "monthly_income",
    ],
  },
  {
    id: "family",
    label: "Family",
    fields: [
      "father_name", "mother_name", "father_status", "mother_status", "father_occupation", "mother_occupation",
      "father_monthly_income", "mother_monthly_income", "guardian_relation", "guardian_name", "guardian_occupation",
      "family_monthly_income", "guardian_phone", "siblings_count", "siblings_studying_count",
      "siblings_working_count", "siblings_married_count", "siblings_other_count", "siblings_notes",
    ],
  },
  {
    id: "academics",
    label: "Academics",
    fields: [
      "education", "documents.education_proof", "current_institution", "campus_city", "degree_level", "field_of_study", "program_title", "program_track",
      "program_track_other", "specialization", "study_years", "completion_term", "completion_year", "roll_number",
      "current_semester", "current_gpa", "gpa_scale", "terms", "previous_institution", "previous_qualification",
      "previous_completion_year", "fee", "fee_due_date", "amount_requested",
      "institution_phone", "institution_address",
    ],
  },
  {
    id: "support",
    label: "Support",
    fields: [
      "rapid_received", "rapid_semesters", "rapid_amount", "other_financial_support", "support_provider",
      "support_value_kind", "support_percent", "support_amount", "heard_about", "church_name", "denomination",
      "pastor_title", "pastor_title_other", "pastor_name", "pastor_phone", "pastor_email", "faculty_ref_name",
      "faculty_ref_designation", "faculty_ref_phone", "faculty_ref_email", "family_ref_name", "family_ref_relationship",
      "family_ref_phone", "family_ref_email", "attend_events",
    ],
  },
  { id: "essays", label: "Essays", fields: ["financial_need_statement", "life_goal", "community_contribution", "plan_if_denied", "future_plan"] },
  { id: "documents", label: "Documents", fields: ["documents", "reuse_cnic", "reuse_guardian"] },
  { id: "consent", label: "Review", fields: ["consent_accepted", "consent_name"] },
] as const;

/** Document slots that are asked outside the Documents step, by the step that owns them. */
export const SLOT_STEP: Record<string, string> = { photo: "personal", education_proof: "academics" };

/** Explicit dotted keys claimed by a step (for example documents.photo on Personal). */
export const CLAIMED_KEYS: ReadonlySet<string> = new Set(
  FORM_STEPS.flatMap((step) => step.fields.filter((field) => field.includes("."))),
);
